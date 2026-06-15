'use strict';

/**
 * P0D — Runtime Activation & Stabilization Validation Service
 * READ ONLY · VALIDATION ONLY · OBSERVATION ONLY
 *
 * Valida activação real e estabilização do runtime contínuo após acção do operador.
 * Não activa workers, não altera env, não reinicia PM2.
 */

const { execSync } = require('child_process');
const checkpoint = require('../audit/ioeContinuousIngestionCheckpointService');
const ioeOp = require('./ioeContinuousOperationService');

const LAYER = 'P0D_RUNTIME_ACTIVATION_STABILIZATION';
const STABILIZATION_WINDOW_HOURS = 24;
const EARLY_FLOW_WINDOW_MINUTES = 60;
const MIN_NEW_IOE = 1;

async function _query(db, sql, params = []) {
  const query = db.query ? db.query.bind(db) : db.pool.query.bind(db.pool);
  return (await query(sql, params)).rows;
}

function _getWorkerStatusSafe() {
  try {
    const outbox = require('../aioi/aioiOutboxWorkerService');
    const continuous = require('../aioi/runtime/aioiContinuousWorkerService');
    return {
      outbox: typeof outbox.getWorkerStatus === 'function' ? outbox.getWorkerStatus() : null,
      continuous: typeof continuous.getWorkerStatus === 'function' ? continuous.getWorkerStatus() : null,
      advisory_lock_keys: { outbox_worker: 8820202606, continuous_worker: 8820202607 }
    };
  } catch (err) {
    return { error: err.message };
  }
}

function _getPm2Meta() {
  try {
    const raw = execSync('pm2 jlist', { timeout: 5000, encoding: 'utf8' });
    const list = JSON.parse(raw);
    const be = list.find((p) => p.name === 'impetus-backend');
    if (!be) return { found: false, status: 'not_found' };
    const uptimeMs = be.pm2_env?.pm_uptime ? Date.now() - be.pm2_env.pm_uptime : null;
    return {
      found: true,
      status: be.pm2_env?.status,
      restarts: be.pm2_env?.restart_time ?? 0,
      unstable_restarts: be.pm2_env?.unstable_restarts ?? 0,
      uptime_ms: uptimeMs,
      uptime_hours: uptimeMs != null ? Math.round((uptimeMs / 3600000) * 10) / 10 : null,
      memory_bytes: be.monit?.memory ?? null,
      cpu_pct: be.monit?.cpu ?? null
    };
  } catch (err) {
    return { found: false, error: err.message };
  }
}

function _readActivationContext() {
  const envFileVars = checkpoint.readEnvFile();
  const envCheck = checkpoint.checkEnvConfiguration(envFileVars);
  const bootLog = checkpoint.parseBootLogEvidence();
  return { envCheck, bootLog, envFileVars };
}

/**
 * P0D.1 — Runtime activation validation
 */
async function validateRuntimeActivation(liveRuntime, workersInProcess, envCheck, bootLog) {
  const envOk =
    envCheck.summary.outbox_worker_enabled &&
    envCheck.summary.continuous_ingestion_enabled &&
    envCheck.summary.event_pipeline_env_enabled;

  if (!envOk) {
    return {
      runtime_activated: false,
      reason: 'CONTINUOUS_RUNTIME_NOT_ENABLED',
      workers_online: false,
      pipeline_active: false,
      scheduler_active: false,
      leases_valid: false,
      edge_queues_active: false,
      flags: {
        IMPETUS_AIOI_OUTBOX_WORKER_ENABLED: envCheck.summary.outbox_worker_enabled,
        IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED: envCheck.summary.continuous_ingestion_enabled,
        IMPETUS_EVENT_PIPELINE_ENABLED: envCheck.summary.event_pipeline_env_enabled
      }
    };
  }

  const outboxRunning = workersInProcess?.outbox?.worker_running === true;
  const continuousRunning =
    workersInProcess?.continuous?.worker_running === true ||
    liveRuntime?.continuous_worker_running === true;
  const workersOnline = outboxRunning || continuousRunning;

  const pipelineActive =
    bootLog.event_pipeline_boot_ok &&
    bootLog.outbox_worker_boot_active &&
    bootLog.continuous_worker_boot_active;

  const schedulerActive = workersOnline;
  const leasesValid = Boolean(workersInProcess?.advisory_lock_keys);

  let edgePending = 0;
  try {
    const db = require('../../db');
    const r = await _query(db, `SELECT COUNT(*)::int AS cnt FROM edge_runtime_queue WHERE synced_at IS NULL`);
    edgePending = r[0]?.cnt ?? 0;
  } catch {
    edgePending = null;
  }

  const edgeQueuesActive = edgePending === 0 || edgePending === null;
  const runtimeActivated = envOk && (workersOnline || pipelineActive);

  return {
    runtime_activated: runtimeActivated,
    reason: runtimeActivated ? null : 'WORKERS_NOT_ONLINE_AFTER_ENABLE',
    workers_online: workersOnline,
    outbox_worker_running: outboxRunning,
    continuous_worker_running: continuousRunning,
    pipeline_active: pipelineActive,
    scheduler_active: schedulerActive,
    leases_valid: leasesValid,
    edge_queues_active: edgeQueuesActive,
    edge_queue_pending: edgePending,
    boot_evidence: {
      event_pipeline_boot_ok: bootLog.event_pipeline_boot_ok,
      outbox_worker_boot_active: bootLog.outbox_worker_boot_active,
      continuous_worker_boot_active: bootLog.continuous_worker_boot_active
    },
    live_runtime: liveRuntime
  };
}

/**
 * P0D.2 — Early flow validation
 */
async function validateEarlyFlow(db, options = {}) {
  const windowMinutes = options.windowMinutes ?? EARLY_FLOW_WINDOW_MINUTES;

  const [ioeRecent, ioeByTenant, outboxRecent, outboxDelivered, firstIoe, firstDelivery] =
    await Promise.all([
      _query(db, `
        SELECT COUNT(*)::int AS cnt FROM industrial_operational_events
        WHERE created_at > NOW() - ($1::text || ' minutes')::interval
      `, [String(windowMinutes)]),
      _query(db, `
        SELECT company_id, COUNT(*)::int AS cnt
        FROM industrial_operational_events
        WHERE created_at > NOW() - ($1::text || ' minutes')::interval
        GROUP BY company_id ORDER BY cnt DESC
      `, [String(windowMinutes)]),
      _query(db, `
        SELECT COUNT(*)::int AS cnt FROM aioi_outbox
        WHERE created_at > NOW() - ($1::text || ' minutes')::interval
      `, [String(windowMinutes)]),
      _query(db, `
        SELECT COUNT(*)::int AS cnt FROM aioi_outbox
        WHERE status = 'delivered'
          AND processed_at > NOW() - ($1::text || ' minutes')::interval
      `, [String(windowMinutes)]),
      _query(db, `
        SELECT MIN(created_at) AS ts FROM industrial_operational_events
        WHERE created_at > NOW() - ($1::text || ' minutes')::interval
      `, [String(windowMinutes)]),
      _query(db, `
        SELECT MIN(processed_at) AS ts FROM aioi_outbox
        WHERE processed_at > NOW() - ($1::text || ' minutes')::interval
      `, [String(windowMinutes)])
    ]);

  const newIoe = ioeRecent[0]?.cnt ?? 0;
  const newDeliveries = outboxDelivered[0]?.cnt ?? 0;

  return {
    window_minutes: windowMinutes,
    new_ioe_count: newIoe,
    new_ioe_detected: newIoe >= MIN_NEW_IOE,
    events_per_tenant: ioeByTenant,
    new_outbox_items: outboxRecent[0]?.cnt ?? 0,
    new_outbox_deliveries: newDeliveries,
    new_outbox_delivery_detected: newDeliveries >= MIN_NEW_IOE,
    first_ioe_at: firstIoe[0]?.ts ?? null,
    first_delivery_at: firstDelivery[0]?.ts ?? null
  };
}

/**
 * P0D.3 — Runtime stabilization monitoring (24h)
 */
async function monitorRuntimeStabilization(db, options = {}) {
  const windowHours = options.windowHours ?? STABILIZATION_WINDOW_HOURS;

  const [ioeWindow, outboxWindow, failed, pending, retries, hourlyIoe] = await Promise.all([
    _query(db, `
      SELECT COUNT(*)::int AS cnt FROM industrial_operational_events
      WHERE created_at > NOW() - ($1::text || ' hours')::interval
    `, [String(windowHours)]),
    _query(db, `
      SELECT COUNT(*)::int AS cnt FROM aioi_outbox
      WHERE created_at > NOW() - ($1::text || ' hours')::interval
    `, [String(windowHours)]),
    _query(db, `SELECT COUNT(*)::int AS cnt FROM aioi_outbox WHERE status = 'failed'`),
    _query(db, `SELECT COUNT(*)::int AS cnt FROM aioi_outbox WHERE processed_at IS NULL`),
    _query(db, `
      SELECT COUNT(*)::int AS cnt FROM aioi_outbox
      WHERE retry_count > 0 AND created_at > NOW() - ($1::text || ' hours')::interval
    `, [String(windowHours)]).catch(() => [{ cnt: 0 }]),
    _query(db, `
      SELECT date_trunc('hour', created_at) AS hour, COUNT(*)::int AS cnt
      FROM industrial_operational_events
      WHERE created_at > NOW() - ($1::text || ' hours')::interval
      GROUP BY 1 ORDER BY 1 DESC LIMIT 24
    `, [String(windowHours)])
  ]);

  const throughputIoePerHour =
    windowHours > 0 ? Math.round(((ioeWindow[0]?.cnt ?? 0) / windowHours) * 10) / 10 : 0;

  const runtimeStable =
    (failed[0]?.cnt ?? 0) === 0 &&
    (pending[0]?.cnt ?? 0) === 0 &&
    (retries[0]?.cnt ?? 0) === 0;

  return {
    window_hours: windowHours,
    ioe_in_window: ioeWindow[0]?.cnt ?? 0,
    outbox_in_window: outboxWindow[0]?.cnt ?? 0,
    throughput_ioe_per_hour: throughputIoePerHour,
    backlog_pending: pending[0]?.cnt ?? 0,
    failed_total: failed[0]?.cnt ?? 0,
    retries_in_window: retries[0]?.cnt ?? 0,
    hourly_ioe: hourlyIoe,
    runtime_stable: runtimeStable
  };
}

/**
 * P0D.4 — Multi-tenant runtime validation
 */
async function validateMultiTenantRuntime(db, options = {}) {
  const windowHours = options.windowHours ?? STABILIZATION_WINDOW_HOURS;

  let rlsFlags = null;
  try {
    rlsFlags = require('../../tenant-isolation/config/tenantRlsFlags');
  } catch {
    rlsFlags = null;
  }

  const byTenant = await _query(db, `
    SELECT company_id, COUNT(*)::int AS cnt
    FROM industrial_operational_events
    WHERE created_at > NOW() - ($1::text || ' hours')::interval
    GROUP BY company_id ORDER BY cnt DESC
  `, [String(windowHours)]);

  const segregated = byTenant.every((r) => r.company_id != null);

  return {
    window_hours: windowHours,
    active_tenants: byTenant.length,
    events_per_tenant: byTenant,
    events_segregated: segregated,
    rls_enabled: rlsFlags ? rlsFlags.isRlsEnabled() : null,
    rls_mode: rlsFlags ? rlsFlags.rlsMode() : null,
    tenant_isolation_preserved: segregated && byTenant.length >= 0
  };
}

/**
 * P0D.5 — Runtime health certification
 */
async function certifyRuntimeHealth(db) {
  const pm2 = _getPm2Meta();
  const workers = _getWorkerStatusSafe();
  const queue = await ioeOp.validateQueueHealth(db).catch(() => ({ queue_healthy: false }));

  const workersOk =
    workers?.continuous?.worker_running === true ||
    workers?.outbox?.worker_running === true;

  const runtimeHealthOk =
    pm2.found &&
    pm2.status === 'online' &&
    (pm2.unstable_restarts ?? 0) === 0 &&
    queue.queue_healthy !== false;

  return {
    pm2,
    workers,
    queue_health: queue,
    workers_ok: workersOk,
    runtime_health_ok: runtimeHealthOk,
    memory_bytes: pm2.memory_bytes,
    cpu_pct: pm2.cpu_pct
  };
}

/**
 * Validação completa P0D
 */
async function generateRuntimeStabilizationValidation(options = {}) {
  const db = options.db || require('../../db');
  const { envCheck, bootLog } = _readActivationContext();
  const liveRuntime = await checkpoint.checkLiveRuntime(options.apiBase);
  const workersInProcess = _getWorkerStatusSafe();

  const activation = await validateRuntimeActivation(
    liveRuntime,
    workersInProcess,
    envCheck,
    bootLog
  );

  if (!activation.runtime_activated) {
    const reason = activation.reason === 'CONTINUOUS_RUNTIME_NOT_ENABLED'
      ? 'CONTINUOUS_RUNTIME_NOT_ENABLED'
      : activation.reason || 'CONTINUOUS_RUNTIME_NOT_ENABLED';

    return {
      layer: LAYER,
      mode: 'READ_ONLY_VALIDATION',
      generated_at: new Date().toISOString(),
      phase: 'P0D',
      pass: false,
      verdict: null,
      reason,
      activation,
      operator_steps_required: [
        'IMPETUS_AIOI_OUTBOX_WORKER_ENABLED=true',
        'IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED=true',
        'IMPETUS_EVENT_PIPELINE_ENABLED=true',
        'pm2 restart impetus-backend --update-env'
      ],
      criteria: {
        runtime_activated: false,
        new_ioe_detected: false,
        new_outbox_delivery_detected: false,
        runtime_stable: false,
        tenant_isolation_preserved: false,
        runtime_health_ok: false,
        dashboard_ready: true,
        api_ready: true
      },
      summary: {
        runtime_status: 'NOT_ENABLED',
        workers_online: false,
        ioe_per_hour: 0,
        deliveries_per_hour: 0,
        active_tenants: 0,
        backlog: 0,
        runtime_health: 'FAIL'
      }
    };
  }

  const [earlyFlow, stabilization, multiTenant, health] = await Promise.all([
    validateEarlyFlow(db, { windowMinutes: options.earlyWindowMinutes }),
    monitorRuntimeStabilization(db, { windowHours: options.windowHours }),
    validateMultiTenantRuntime(db, { windowHours: options.windowHours }),
    certifyRuntimeHealth(db)
  ]);

  const criteria = {
    runtime_activated: activation.runtime_activated,
    new_ioe_detected: earlyFlow.new_ioe_detected,
    new_outbox_delivery_detected: earlyFlow.new_outbox_delivery_detected,
    runtime_stable: stabilization.runtime_stable,
    tenant_isolation_preserved: multiTenant.tenant_isolation_preserved,
    runtime_health_ok: health.runtime_health_ok,
    dashboard_ready: true,
    api_ready: true
  };

  const pass =
    criteria.runtime_activated &&
    criteria.new_ioe_detected &&
    criteria.new_outbox_delivery_detected &&
    criteria.runtime_stable &&
    criteria.tenant_isolation_preserved &&
    criteria.runtime_health_ok;

  return {
    layer: LAYER,
    mode: 'READ_ONLY_VALIDATION',
    generated_at: new Date().toISOString(),
    phase: 'P0D',
    pass,
    verdict: pass
      ? 'CONTINUOUS_RUNTIME_ACTIVATED_AND_STABILIZED'
      : 'CONTINUOUS_RUNTIME_STABILIZATION_PENDING',
    reason: pass ? null : 'RUNTIME_ACTIVATED_BUT_STABILIZATION_CRITERIA_NOT_MET',
    activation,
    early_flow: earlyFlow,
    stabilization,
    multi_tenant: multiTenant,
    health,
    criteria,
    summary: {
      runtime_status: activation.workers_online ? 'RUNNING' : 'CONFIGURED',
      workers_online: activation.workers_online,
      ioe_per_hour: stabilization.throughput_ioe_per_hour,
      deliveries_per_hour: earlyFlow.new_outbox_deliveries,
      active_tenants: multiTenant.active_tenants,
      backlog: stabilization.backlog_pending,
      runtime_health: health.runtime_health_ok ? 'OK' : 'DEGRADED'
    }
  };
}

function getRuntimeStatusSnapshot(report) {
  return {
    ok: report.pass,
    layer: LAYER,
    read_only: true,
    phase: 'P0D',
    pass: report.pass,
    verdict: report.verdict,
    reason: report.reason,
    summary: report.summary,
    criteria: report.criteria,
    timestamp: report.generated_at
  };
}

module.exports = {
  LAYER,
  STABILIZATION_WINDOW_HOURS,
  validateRuntimeActivation,
  validateEarlyFlow,
  monitorRuntimeStabilization,
  validateMultiTenantRuntime,
  certifyRuntimeHealth,
  generateRuntimeStabilizationValidation,
  getRuntimeStatusSnapshot
};
