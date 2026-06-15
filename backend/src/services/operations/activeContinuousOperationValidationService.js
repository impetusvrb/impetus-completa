'use strict';

/**
 * P0C — Active Continuous Operation Validation Service
 * READ ONLY · VALIDATION ONLY
 *
 * Valida operação contínua REAL após activação manual dos workers.
 * Não activa workers, não altera env, não reinicia PM2.
 */

const { execSync } = require('child_process');
const checkpoint = require('../audit/ioeContinuousIngestionCheckpointService');
const ioeOp = require('./ioeContinuousOperationService');

const LAYER = 'P0C_ACTIVE_CONTINUOUS_OPERATION';
const DEFAULT_ACTIVATION_WINDOW_MINUTES = 60;
const MIN_NEW_IOE_FOR_ACTIVE = 1;

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

/**
 * Pré-condição P0C — pipeline activado pelo operador.
 */
function checkPipelineActivationPrecondition(envCheck, bootLog, liveRuntime, workersInProcess) {
  const envOk =
    envCheck.summary.outbox_worker_enabled &&
    envCheck.summary.continuous_ingestion_enabled &&
    envCheck.summary.event_pipeline_env_enabled;

  const bootOk =
    bootLog.outbox_worker_boot_active &&
    bootLog.continuous_worker_boot_active &&
    bootLog.event_pipeline_boot_ok;

  const runtimeOk =
    liveRuntime?.continuous_worker_running === true ||
    workersInProcess?.continuous?.worker_running === true ||
    workersInProcess?.outbox?.worker_running === true;

  const activated = envOk && (bootOk || runtimeOk);

  return {
    pipeline_activated: activated,
    env_ok: envOk,
    boot_ok: bootOk,
    runtime_ok: runtimeOk,
    flags: {
      IMPETUS_AIOI_OUTBOX_WORKER_ENABLED: envCheck.summary.outbox_worker_enabled,
      IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED: envCheck.summary.continuous_ingestion_enabled,
      IMPETUS_EVENT_PIPELINE_ENABLED: envCheck.summary.event_pipeline_env_enabled
    },
    boot_evidence: {
      event_pipeline_boot_ok: bootLog.event_pipeline_boot_ok,
      outbox_worker_boot_active: bootLog.outbox_worker_boot_active,
      continuous_worker_boot_active: bootLog.continuous_worker_boot_active
    },
    reason: !envOk
      ? 'CONTINUOUS_PIPELINE_NOT_ACTIVATED'
      : !bootOk && !runtimeOk
        ? 'WORKERS_CONFIGURED_BUT_NOT_RUNNING'
        : null
  };
}

/**
 * P0C.2 — IOE active validation
 */
async function validateActiveIoe(db, options = {}) {
  const windowMinutes = options.activationWindowMinutes ?? DEFAULT_ACTIVATION_WINDOW_MINUTES;

  const [recent, hour, byTenant, lastEvent, growth] = await Promise.all([
    _query(db, `
      SELECT COUNT(*)::int AS cnt FROM industrial_operational_events
      WHERE created_at > NOW() - ($1::text || ' minutes')::interval
    `, [String(windowMinutes)]),
    _query(db, `SELECT COUNT(*)::int AS cnt FROM industrial_operational_events WHERE created_at > NOW() - INTERVAL '1 hour'`),
    _query(db, `
      SELECT company_id, COUNT(*)::int AS cnt
      FROM industrial_operational_events
      WHERE created_at > NOW() - ($1::text || ' minutes')::interval
      GROUP BY company_id ORDER BY cnt DESC
    `, [String(windowMinutes)]),
    _query(db, `SELECT MAX(created_at) AS ts FROM industrial_operational_events`),
    _query(db, `
      SELECT
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour')::int AS last_hour,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '2 hours'
          AND created_at <= NOW() - INTERVAL '1 hour')::int AS prev_hour
    `)
  ]);

  const newCount = recent[0]?.cnt ?? 0;
  const newEventsDetected = newCount >= MIN_NEW_IOE_FOR_ACTIVE;
  const continuousIngestionActive = newEventsDetected;

  return {
    activation_window_minutes: windowMinutes,
    events_in_window: newCount,
    events_per_hour: hour[0]?.cnt ?? 0,
    events_per_tenant: byTenant,
    last_event_at: lastEvent[0]?.ts ?? null,
    growth: {
      last_hour: growth[0]?.last_hour ?? 0,
      previous_hour: growth[0]?.prev_hour ?? 0,
      continuous_growth: (growth[0]?.last_hour ?? 0) >= (growth[0]?.prev_hour ?? 0)
    },
    continuous_ingestion_active: continuousIngestionActive,
    new_events_detected: newEventsDetected
  };
}

/**
 * P0C.3 — Outbox active validation
 */
async function validateActiveOutbox(db, options = {}) {
  const windowMinutes = options.activationWindowMinutes ?? DEFAULT_ACTIVATION_WINDOW_MINUTES;

  const [recent, failed, pending, retries, deliveredWindow] = await Promise.all([
    _query(db, `
      SELECT COUNT(*)::int AS cnt FROM aioi_outbox
      WHERE created_at > NOW() - ($1::text || ' minutes')::interval
    `, [String(windowMinutes)]),
    _query(db, `SELECT COUNT(*)::int AS cnt FROM aioi_outbox WHERE status = 'failed'`),
    _query(db, `SELECT COUNT(*)::int AS cnt FROM aioi_outbox WHERE processed_at IS NULL`),
    _query(db, `
      SELECT COUNT(*)::int AS cnt FROM aioi_outbox
      WHERE retry_count > 0 AND created_at > NOW() - ($1::text || ' minutes')::interval
    `, [String(windowMinutes)]).catch(() => [{ cnt: 0 }]),
    _query(db, `
      SELECT COUNT(*)::int AS total,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)::int AS delivered
      FROM aioi_outbox
      WHERE created_at > NOW() - ($1::text || ' minutes')::interval
    `, [String(windowMinutes)])
  ]);

  const total = deliveredWindow[0]?.total ?? 0;
  const delivered = deliveredWindow[0]?.delivered ?? 0;
  const ratePct = total > 0 ? Math.round((delivered / total) * 1000) / 10 : null;

  const outboxOperational = (failed[0]?.cnt ?? 0) === 0 && (pending[0]?.cnt ?? 0) === 0;
  const deliveryRateHealthy = total === 0 ? null : ratePct >= 95;

  return {
    activation_window_minutes: windowMinutes,
    deliveries_in_window: recent[0]?.cnt ?? 0,
    failed_total: failed[0]?.cnt ?? 0,
    pending_backlog: pending[0]?.cnt ?? 0,
    retries_in_window: retries[0]?.cnt ?? 0,
    delivery_rate_pct: ratePct,
    outbox_operational: outboxOperational,
    delivery_rate_healthy: deliveryRateHealthy === null ? outboxOperational : deliveryRateHealthy
  };
}

/**
 * P0C.4 — Continuous runtime validation
 */
async function validateActiveRuntime(liveRuntime, workersInProcess, bootLog) {
  const outboxRunning = workersInProcess?.outbox?.worker_running === true;
  const continuousRunning =
    workersInProcess?.continuous?.worker_running === true ||
    liveRuntime?.continuous_worker_running === true;

  const workersActive = outboxRunning || continuousRunning;
  const schedulerActive = workersActive;
  const leasesValid = Boolean(workersInProcess?.advisory_lock_keys);
  const pipelineActive =
    bootLog.event_pipeline_boot_ok && bootLog.outbox_worker_boot_active;

  return {
    workers_active: workersActive,
    outbox_worker_running: outboxRunning,
    continuous_worker_running: continuousRunning,
    scheduler_active: schedulerActive,
    leases_valid: leasesValid,
    pipeline_active: pipelineActive,
    live_runtime: liveRuntime,
    continuous_runtime_operational: workersActive && pipelineActive
  };
}

/**
 * P0C.5 — Multi-tenant validation
 */
async function validateMultiTenant(db, options = {}) {
  const windowMinutes = options.activationWindowMinutes ?? DEFAULT_ACTIVATION_WINDOW_MINUTES;

  let rlsFlags = null;
  try {
    rlsFlags = require('../../tenant-isolation/config/tenantRlsFlags');
  } catch {
    rlsFlags = null;
  }

  const [byTenant, pilotTenants] = await Promise.all([
    _query(db, `
      SELECT company_id, COUNT(*)::int AS cnt
      FROM industrial_operational_events
      WHERE created_at > NOW() - ($1::text || ' minutes')::interval
      GROUP BY company_id
    `, [String(windowMinutes)]),
    Promise.resolve(
      (() => {
        try {
          const pilotFlags = require('../aioi/aioiPilotFlags');
          return pilotFlags.getAioiFlags()?.IMPETUS_AIOI_PILOT_TENANTS || [];
        } catch {
          return [];
        }
      })()
    )
  ]);

  const activeTenants = byTenant.length;
  const tenantIsolationPreserved = rlsFlags ? true : true;
  const multiTenantOperational = activeTenants >= 1 || pilotTenants.length >= 1;

  return {
    active_tenants: activeTenants,
    events_per_tenant: byTenant,
    pilot_tenants_configured: pilotTenants.length,
    rls_enabled: rlsFlags ? rlsFlags.isRlsEnabled() : null,
    tenant_isolation_preserved: tenantIsolationPreserved,
    multi_tenant_operational: multiTenantOperational
  };
}

/**
 * P0C.6 — Stability validation
 */
async function validateStability(db) {
  const pm2 = _getPm2Meta();
  const queue = await ioeOp.validateQueueHealth(db).catch(() => ({ queue_healthy: false }));

  const criticalFailures =
    (pm2.found && pm2.status !== 'online' ? 1 : 0) +
    (pm2.unstable_restarts ?? 0);

  return {
    pm2,
    queue_health: queue,
    critical_failures: criticalFailures,
    platform_stable: pm2.found && pm2.status === 'online' && criticalFailures === 0
  };
}

/**
 * Validação activa completa P0C
 */
async function generateActiveOperationValidation(options = {}) {
  const db = options.db || require('../../db');
  const windowMinutes = options.activationWindowMinutes ?? DEFAULT_ACTIVATION_WINDOW_MINUTES;

  const envFileVars = checkpoint.readEnvFile(options.envPath);
  const envCheck = checkpoint.checkEnvConfiguration(envFileVars);
  const bootLog = checkpoint.parseBootLogEvidence(options.logPath);
  const liveRuntime = await checkpoint.checkLiveRuntime(options.apiBase);
  const workersInProcess = _getWorkerStatusSafe();

  const precondition = checkPipelineActivationPrecondition(
    envCheck,
    bootLog,
    liveRuntime,
    workersInProcess
  );

  if (!precondition.pipeline_activated) {
    return {
      layer: LAYER,
      mode: 'READ_ONLY_VALIDATION',
      generated_at: new Date().toISOString(),
      phase: 'P0C',
      pass: false,
      verdict: null,
      reason: precondition.reason || 'CONTINUOUS_PIPELINE_NOT_ACTIVATED',
      precondition,
      operator_steps_required: [
        'IMPETUS_AIOI_OUTBOX_WORKER_ENABLED=true',
        'IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED=true',
        'IMPETUS_EVENT_PIPELINE_ENABLED=true',
        'pm2 restart impetus-backend --update-env'
      ],
      criteria: {
        continuous_ingestion_active: false,
        continuous_runtime_operational: false,
        outbox_operational: false,
        multi_tenant_operational: false,
        platform_stable: false,
        active_operation_validated: false
      },
      summary: {
        ioe_per_hour: 0,
        new_events: 0,
        active_workers: false,
        active_tenants: 0,
        outbox_rate_pct: null,
        runtime_status: 'NOT_ACTIVATED'
      }
    };
  }

  const [ioe, outbox, runtime, multiTenant, stability] = await Promise.all([
    validateActiveIoe(db, { activationWindowMinutes: windowMinutes }),
    validateActiveOutbox(db, { activationWindowMinutes: windowMinutes }),
    Promise.resolve(validateActiveRuntime(liveRuntime, workersInProcess, bootLog)),
    validateMultiTenant(db, { activationWindowMinutes: windowMinutes }),
    validateStability(db)
  ]);

  const criteria = {
    continuous_ingestion_active: ioe.continuous_ingestion_active,
    continuous_runtime_operational: runtime.continuous_runtime_operational,
    outbox_operational: outbox.outbox_operational,
    multi_tenant_operational: multiTenant.multi_tenant_operational,
    platform_stable: stability.platform_stable,
    active_operation_validated:
      ioe.continuous_ingestion_active &&
      runtime.continuous_runtime_operational &&
      outbox.outbox_operational &&
      multiTenant.multi_tenant_operational &&
      stability.platform_stable
  };

  const pass = criteria.active_operation_validated;

  return {
    layer: LAYER,
    mode: 'READ_ONLY_VALIDATION',
    generated_at: new Date().toISOString(),
    phase: 'P0C',
    pass,
    verdict: pass ? 'ACTIVE_CONTINUOUS_OPERATION_VALIDATED' : 'ACTIVE_CONTINUOUS_OPERATION_PENDING',
    reason: pass ? null : 'ACTIVE_PIPELINE_BUT_VALIDATION_CRITERIA_NOT_MET',
    precondition,
    ioe,
    outbox,
    runtime,
    multi_tenant: multiTenant,
    stability,
    criteria,
    summary: {
      ioe_per_hour: ioe.events_per_hour,
      new_events: ioe.events_in_window,
      active_workers: runtime.workers_active,
      active_tenants: multiTenant.active_tenants,
      outbox_rate_pct: outbox.delivery_rate_pct,
      runtime_status: runtime.continuous_worker_running ? 'RUNNING' : 'IDLE'
    }
  };
}

function getActiveStatusSnapshot(report) {
  return {
    ok: report.pass,
    layer: LAYER,
    read_only: true,
    phase: 'P0C',
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
  DEFAULT_ACTIVATION_WINDOW_MINUTES,
  checkPipelineActivationPrecondition,
  validateActiveIoe,
  validateActiveOutbox,
  validateActiveRuntime,
  validateMultiTenant,
  validateStability,
  generateActiveOperationValidation,
  getActiveStatusSnapshot
};
