'use strict';

/**
 * P0A.1 / P0A.2 / P0A.3 — IOE Continuous Operation Activation Service
 * READ ONLY · VALIDATION ONLY · sem activação automática
 *
 * Valida pré-condições para operação industrial contínua.
 * Não altera env, não reinicia PM2, não activa workers.
 */

const checkpoint = require('../audit/ioeContinuousIngestionCheckpointService');
const pilotFlags = require('../aioi/aioiPilotFlags');
const { execSync } = require('child_process');

const LAYER = 'P0A_IOE_CONTINUOUS_OPERATION';

const HARD_BLOCKER_CODES = Object.freeze([
  'db_unavailable',
  'pm2_offline',
  'missing_core_table',
  'outbox_failed_items'
]);

function _getPm2ProcessMeta() {
  try {
    const raw = execSync('pm2 jlist', { timeout: 5000, encoding: 'utf8' });
    const list = JSON.parse(raw);
    const be = list.find((p) => p.name === 'impetus-backend');
    if (!be) return { found: false, status: 'not_found' };
    return {
      found: true,
      status: be.pm2_env?.status,
      restarts: be.pm2_env?.restart_time,
      created_at: be.pm2_env?.created_at ? new Date(be.pm2_env.created_at).toISOString() : null
    };
  } catch (err) {
    return { found: false, status: 'unknown', error: err.message };
  }
}

function _getWorkerStatusSafe() {
  try {
    const outbox = require('../aioi/aioiOutboxWorkerService');
    const continuous = require('../aioi/runtime/aioiContinuousWorkerService');
    return {
      outbox: typeof outbox.getWorkerStatus === 'function' ? outbox.getWorkerStatus() : null,
      continuous: typeof continuous.getWorkerStatus === 'function' ? continuous.getWorkerStatus() : null,
      advisory_lock_keys: {
        outbox_worker: 8820202606,
        continuous_worker: 8820202607
      }
    };
  } catch (err) {
    return { error: err.message };
  }
}

async function _query(db, sql, params = []) {
  const query = db.query ? db.query.bind(db) : db.pool.query.bind(db.pool);
  const r = await query(sql, params);
  return r.rows;
}

async function validatePipelinePlc(db) {
  try {
    const [plcRecent, plcLast, plcTotal] = await Promise.all([
      _query(db, `SELECT COUNT(*)::int AS cnt FROM plc_collected_data WHERE collected_at > NOW() - INTERVAL '1 hour'`),
      _query(db, `SELECT MAX(collected_at) AS ts FROM plc_collected_data`),
      _query(db, `SELECT COUNT(*)::int AS cnt FROM plc_collected_data`)
    ]);
    const recent = plcRecent[0]?.cnt ?? 0;
    return {
      validated: true,
      plc_telemetry_active: recent > 0,
      records_last_hour: recent,
      total_records: plcTotal[0]?.cnt ?? 0,
      last_collected_at: plcLast[0]?.ts ?? null
    };
  } catch (err) {
    return { validated: false, error: err.message };
  }
}

async function validateOutbox(db) {
  try {
    const [statusRows, pending, failed, lastProcessed] = await Promise.all([
      _query(db, `SELECT status, COUNT(*)::int AS cnt FROM aioi_outbox GROUP BY status ORDER BY cnt DESC`),
      _query(db, `SELECT COUNT(*)::int AS cnt FROM aioi_outbox WHERE processed_at IS NULL`),
      _query(db, `SELECT COUNT(*)::int AS cnt FROM aioi_outbox WHERE status = 'failed'`),
      _query(db, `SELECT MAX(processed_at) AS ts FROM aioi_outbox WHERE processed_at IS NOT NULL`)
    ]);
    const delivered = statusRows.find((r) => r.status === 'delivered')?.cnt ?? 0;
    const total = statusRows.reduce((s, r) => s + (r.cnt || 0), 0);
    const deliveryRatePct = total > 0 ? Math.round((delivered / total) * 1000) / 10 : 0;

    return {
      validated: true,
      total,
      delivered,
      pending: pending[0]?.cnt ?? 0,
      failed: failed[0]?.cnt ?? 0,
      delivery_rate_pct: deliveryRatePct,
      last_processed_at: lastProcessed[0]?.ts ?? null,
      healthy: (failed[0]?.cnt ?? 0) === 0
    };
  } catch (err) {
    return { validated: false, error: err.message };
  }
}

async function validateCoreTables(db) {
  const tables = [
    'industrial_operational_events',
    'aioi_outbox',
    'plc_collected_data',
    'edge_runtime_queue'
  ];
  const missing = [];
  for (const table of tables) {
    try {
      await _query(db, `SELECT 1 FROM ${table} LIMIT 1`);
    } catch {
      missing.push(table);
    }
  }
  return { validated: missing.length === 0, tables_checked: tables, missing };
}

async function validateQueueHealth(db) {
  try {
    const [edge, wf] = await Promise.all([
      _query(db, `SELECT COUNT(*)::int AS pending FROM edge_runtime_queue WHERE synced_at IS NULL`),
      _query(db, `SELECT status, COUNT(*)::int AS cnt FROM industrial_workflow_instances GROUP BY status`)
    ]);
    return {
      validated: true,
      edge_queue_pending: edge[0]?.pending ?? 0,
      workflow_by_status: wf,
      queue_healthy: (edge[0]?.pending ?? 0) === 0
    };
  } catch (err) {
    return { validated: false, error: err.message };
  }
}

function validateTenantIsolation() {
  let rlsFlags = null;
  try {
    rlsFlags = require('../../tenant-isolation/config/tenantRlsFlags');
  } catch {
    rlsFlags = null;
  }
  const flags = pilotFlags.getAioiFlags?.() || {};
  return {
    validated: true,
    aioi_enabled: flags.IMPETUS_AIOI_ENABLED === true,
    pilot_tenants: flags.IMPETUS_AIOI_PILOT_TENANTS || [],
    pilot_tenants_count: (flags.IMPETUS_AIOI_PILOT_TENANTS || []).length,
    rls_enabled: rlsFlags ? rlsFlags.isRlsEnabled() : null,
    rls_mode: rlsFlags ? rlsFlags.rlsMode() : null,
    tenant_isolation: 'company_id scoped operations + RLS flags readable'
  };
}

function validateSchedulerConfig() {
  return {
    validated: true,
    outbox_interval_ms: process.env.IMPETUS_AIOI_OUTBOX_WORKER_INTERVAL_MS || 30000,
    continuous_interval_ms: process.env.IMPETUS_AIOI_CONTINUOUS_RUNTIME_INTERVAL_MS || 30000,
    outbox_batch_size: process.env.IMPETUS_AIOI_OUTBOX_BATCH_SIZE || 10,
    scheduler_mode: 'setInterval controlled (advisory lock single-instance)'
  };
}

function buildActivationChecklist(envCheck, bootLog, liveRuntime) {
  const workersEnabled =
    envCheck.summary.outbox_worker_enabled && envCheck.summary.continuous_ingestion_enabled;
  const pipelineEnabled =
    envCheck.summary.event_pipeline_env_enabled && bootLog.event_pipeline_boot_ok;
  const activationAllowed =
    workersEnabled &&
    pipelineEnabled &&
    bootLog.outbox_worker_boot_active &&
    bootLog.continuous_worker_boot_active &&
    liveRuntime.api_reachable;

  return {
    AIOI_OUTBOX_WORKER_ENABLED: {
      key: checkpoint.ENV_KEYS.outbox_worker,
      value: envCheck.item_1_outbox_worker.configured_value,
      enabled: envCheck.summary.outbox_worker_enabled,
      boot_active: bootLog.outbox_worker_boot_active
    },
    AIOI_CONTINUOUS_RUNTIME_ENABLED: {
      key: checkpoint.ENV_KEYS.continuous_runtime,
      value: envCheck.item_2_continuous_runtime.configured_value,
      enabled: envCheck.summary.continuous_ingestion_enabled,
      boot_active: bootLog.continuous_worker_boot_active
    },
    EVENT_PIPELINE_BOOT: {
      env_enabled: envCheck.summary.event_pipeline_env_enabled,
      boot_ok: bootLog.event_pipeline_boot_ok,
      boot_detail: bootLog.event_pipeline_boot
    },
    workers_enabled: workersEnabled,
    pipeline_enabled: pipelineEnabled,
    activation_allowed: activationAllowed,
    note: 'Validação read-only. Activacao explicita pelo operador — sem alteracao automatica.'
  };
}

function collectBlockingIssues({ dbHealth, pm2, outbox, coreTables, liveRuntime }) {
  const issues = [];
  if (!dbHealth.available) issues.push({ code: 'db_unavailable', message: dbHealth.error || 'DB unavailable' });
  if (pm2 && pm2.found && pm2.status && pm2.status !== 'online') {
    issues.push({ code: 'pm2_offline', message: `PM2 status: ${pm2.status}` });
  }
  if (coreTables.missing?.length) {
    issues.push({ code: 'missing_core_table', message: `Missing: ${coreTables.missing.join(', ')}` });
  }
  if ((outbox.failed ?? 0) > 0) {
    issues.push({ code: 'outbox_failed_items', message: `Outbox failed count: ${outbox.failed}` });
  }
  return issues.filter((i) => HARD_BLOCKER_CODES.includes(i.code));
}

/**
 * Avaliação completa P0A — read-only.
 */
async function assessContinuousOperationReadiness(options = {}) {
  const db = options.db || require('../../db');
  const envFileVars = checkpoint.readEnvFile(options.envPath);
  const envCheck = checkpoint.checkEnvConfiguration(envFileVars);
  const bootLog = checkpoint.parseBootLogEvidence(options.logPath);
  const liveRuntime = await checkpoint.checkLiveRuntime(options.apiBase);
  const pm2 = _getPm2ProcessMeta();

  let dbHealth = { available: false };
  let coreTables = { validated: false, missing: ['unknown'] };
  let plc = { validated: false };
  let outbox = { validated: false };
  let queue = { validated: false };

  try {
    await _query(db, 'SELECT 1 AS ok');
    dbHealth = { available: true };
    coreTables = await validateCoreTables(db);
    plc = await validatePipelinePlc(db);
    outbox = await validateOutbox(db);
    queue = await validateQueueHealth(db);
  } catch (err) {
    dbHealth = { available: false, error: err.message };
  }

  const workers = _getWorkerStatusSafe();
  const tenant = validateTenantIsolation();
  const scheduler = validateSchedulerConfig();
  const checklist = buildActivationChecklist(envCheck, bootLog, liveRuntime);
  const blockingIssues = collectBlockingIssues({ dbHealth, pm2, outbox, coreTables, liveRuntime });

  const infrastructureReady =
    dbHealth.available &&
    coreTables.validated &&
    plc.plc_telemetry_active === true &&
    outbox.healthy === true &&
    queue.queue_healthy === true;

  const continuousRuntimeReady = infrastructureReady && blockingIssues.length === 0;

  const activationReady = continuousRuntimeReady;

  return {
    layer: LAYER,
    mode: 'READ_ONLY_VALIDATION',
    auto_activation: false,
    generated_at: new Date().toISOString(),
    activation_ready: activationReady,
    blocking_issues: blockingIssues.length,
    blocking_issue_details: blockingIssues,
    activation_gaps: [
      !checklist.workers_enabled
        ? 'Workers desactivados por env (passo operador: IMPETUS_AIOI_OUTBOX_WORKER_ENABLED + CONTINUOUS_RUNTIME)'
        : null,
      !checklist.pipeline_enabled
        ? 'EVENT_PIPELINE desactivado ou boot não ok (passo operador: IMPETUS_EVENT_PIPELINE_ENABLED + restart manual)'
        : null,
      !liveRuntime.continuous_worker_running
        ? 'Continuous worker não em execução (esperado até activação manual pós-restart)'
        : null
    ].filter(Boolean),
    continuous_runtime_ready: continuousRuntimeReady,
    activation_checklist: checklist,
    preconditions: {
      db: dbHealth,
      core_tables: coreTables,
      pm2: pm2,
      tenant_isolation: tenant
    },
    workers: {
      env: envCheck.summary,
      boot_log: {
        event_pipeline_boot_ok: bootLog.event_pipeline_boot_ok,
        outbox_worker_boot_active: bootLog.outbox_worker_boot_active,
        continuous_worker_boot_active: bootLog.continuous_worker_boot_active
      },
      in_process_status: workers,
      live_runtime: liveRuntime
    },
    leases: {
      mechanism: 'PostgreSQL advisory lock (single-instance)',
      keys: workers.advisory_lock_keys || { outbox_worker: 8820202606, continuous_worker: 8820202607 },
      validated: true
    },
    scheduler: scheduler,
    pipeline_plc: plc,
    outbox: outbox,
    queue_health: queue,
    operator_activation_steps: [
      'Definir IMPETUS_AIOI_OUTBOX_WORKER_ENABLED=true',
      'Definir IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED=true',
      'Definir IMPETUS_EVENT_PIPELINE_ENABLED=true',
      'Confirmar IMPETUS_AIOI_ENABLED=true e IMPETUS_AIOI_PILOT_TENANTS',
      'pm2 restart impetus-backend --update-env (decisão manual do operador)',
      'Revalidar GET /api/operations/continuous/readiness'
    ]
  };
}

function getActivationStatusSnapshot(readiness) {
  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    activation_ready: readiness.activation_ready,
    blocking_issues: readiness.blocking_issues,
    continuous_runtime_ready: readiness.continuous_runtime_ready,
    workers_enabled: readiness.activation_checklist?.workers_enabled ?? false,
    pipeline_enabled: readiness.activation_checklist?.pipeline_enabled ?? false,
    activation_allowed: readiness.activation_checklist?.activation_allowed ?? false,
    timestamp: readiness.generated_at
  };
}

module.exports = {
  LAYER,
  assessContinuousOperationReadiness,
  getActivationStatusSnapshot,
  validatePipelinePlc,
  validateOutbox,
  validateQueueHealth,
  buildActivationChecklist
};
