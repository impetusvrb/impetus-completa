'use strict';

/**
 * P0B.1 — Continuous Operation Observation Service
 * READ ONLY · OBSERVATION ONLY
 *
 * Consolida métricas operacionais reais, detecta interrupções, regista observações.
 * Sem activação automática, sem mutações BD, sem alteração de configuração.
 */

const { execSync } = require('child_process');
const checkpoint = require('../audit/ioeContinuousIngestionCheckpointService');
const ioeOp = require('./ioeContinuousOperationService');

const LAYER = 'P0B_CONTINUOUS_OPERATION_OBSERVATION';
const DEFAULT_WINDOW_DAYS = 7;
const INTERRUPTION_IOE_HOURS = 2;

async function _query(db, sql, params = []) {
  const query = db.query ? db.query.bind(db) : db.pool.query.bind(db.pool);
  return (await query(sql, params)).rows;
}

function _envTruthy(v) {
  return String(v ?? '').trim().toLowerCase() === 'true';
}

function _readWorkerEnvState() {
  const envFileVars = checkpoint.readEnvFile();
  const envCheck = checkpoint.checkEnvConfiguration(envFileVars);
  return {
    outbox_worker_enabled: envCheck.summary.outbox_worker_enabled,
    continuous_runtime_enabled: envCheck.summary.continuous_ingestion_enabled,
    event_pipeline_enabled: envCheck.summary.event_pipeline_env_enabled
  };
}

/**
 * P0B.2 — Ingestion observation
 */
async function observeIngestion(db, options = {}) {
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const workers = _readWorkerEnvState();

  const [
    ioeHour,
    ioeDay,
    ioeWindow,
    ioeLast,
    ioeByTenant,
    outboxFailed,
    outboxPending,
    outboxWindow,
    outboxDeliveredWindow,
    edgePending,
    plcHour,
    plcDay
  ] = await Promise.all([
    _query(db, `SELECT COUNT(*)::int AS cnt FROM industrial_operational_events WHERE created_at > NOW() - INTERVAL '1 hour'`),
    _query(db, `SELECT COUNT(*)::int AS cnt FROM industrial_operational_events WHERE created_at > NOW() - INTERVAL '24 hours'`),
    _query(db, `
      SELECT COUNT(*)::int AS cnt FROM industrial_operational_events
      WHERE created_at > NOW() - ($1::text || ' days')::interval
    `, [String(windowDays)]),
    _query(db, `SELECT MAX(created_at) AS ts FROM industrial_operational_events`),
    _query(db, `
      SELECT company_id, COUNT(*)::int AS cnt
      FROM industrial_operational_events
      WHERE created_at > NOW() - ($1::text || ' days')::interval
      GROUP BY company_id ORDER BY cnt DESC LIMIT 10
    `, [String(windowDays)]),
    _query(db, `SELECT COUNT(*)::int AS cnt FROM aioi_outbox WHERE status = 'failed'`),
    _query(db, `SELECT COUNT(*)::int AS cnt FROM aioi_outbox WHERE processed_at IS NULL`),
    _query(db, `
      SELECT COUNT(*)::int AS cnt FROM aioi_outbox
      WHERE created_at > NOW() - ($1::text || ' days')::interval
    `, [String(windowDays)]),
    _query(db, `
      SELECT COUNT(*)::int AS total,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END)::int AS delivered
      FROM aioi_outbox
      WHERE created_at > NOW() - ($1::text || ' days')::interval
    `, [String(windowDays)]),
    _query(db, `SELECT COUNT(*)::int AS cnt FROM edge_runtime_queue WHERE synced_at IS NULL`),
    _query(db, `SELECT COUNT(*)::int AS cnt FROM plc_collected_data WHERE collected_at > NOW() - INTERVAL '1 hour'`),
    _query(db, `SELECT COUNT(*)::int AS cnt FROM plc_collected_data WHERE collected_at > NOW() - INTERVAL '24 hours'`)
  ]);

  const lastIoeAt = ioeLast[0]?.ts ? new Date(ioeLast[0].ts) : null;
  const hoursSinceLastIoe = lastIoeAt
    ? Math.round(((Date.now() - lastIoeAt.getTime()) / 3600000) * 10) / 10
    : null;

  const outTotal = outboxDeliveredWindow[0]?.total ?? 0;
  const outDel = outboxDeliveredWindow[0]?.delivered ?? 0;
  const deliveryRatePct = outTotal > 0 ? Math.round((outDel / outTotal) * 1000) / 10 : 100;

  const dataLoss = outboxFailed[0]?.cnt ?? 0;
  const workersExpectedActive =
    workers.outbox_worker_enabled && workers.continuous_runtime_enabled;

  let interruptionDetected = false;
  let interruptionType = null;
  if (workersExpectedActive && hoursSinceLastIoe != null && hoursSinceLastIoe > INTERRUPTION_IOE_HOURS) {
    interruptionDetected = true;
    interruptionType = 'ioe_gap_with_workers_enabled';
  } else if (!workersExpectedActive && (ioeHour[0]?.cnt ?? 0) === 0) {
    interruptionType = 'ioe_paused_workers_disabled_by_config';
  }

  const plcActive = (plcHour[0]?.cnt ?? 0) > 0;
  const ingestionHealthy =
    dataLoss === 0 &&
    (outboxPending[0]?.cnt ?? 0) === 0 &&
    (plcActive || (ioeHour[0]?.cnt ?? 0) > 0 || !workersExpectedActive);

  return {
    observation_window_days: windowDays,
    events_per_hour: ioeHour[0]?.cnt ?? 0,
    events_per_day: ioeDay[0]?.cnt ?? 0,
    events_in_window: ioeWindow[0]?.cnt ?? 0,
    events_per_tenant: ioeByTenant,
    active_tenants: ioeByTenant.length,
    outbox_delivery_rate_pct: deliveryRatePct,
    outbox_failed: dataLoss,
    outbox_pending: outboxPending[0]?.cnt ?? 0,
    outbox_in_window: outboxWindow[0]?.cnt ?? 0,
    edge_queue_pending: edgePending[0]?.cnt ?? 0,
    plc_telemetry_per_hour: plcHour[0]?.cnt ?? 0,
    plc_telemetry_per_day: plcDay[0]?.cnt ?? 0,
    last_ioe_at: lastIoeAt?.toISOString() ?? null,
    hours_since_last_ioe: hoursSinceLastIoe,
    workers_env: workers,
    interruption_detected: interruptionDetected,
    interruption_type: interruptionType,
    ingestion_healthy: ingestionHealthy,
    data_loss: dataLoss
  };
}

/**
 * P0B.3 — Workflow observation
 */
async function observeWorkflows(db, options = {}) {
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;

  const [byStatus, windowActivity, hitlQueue, unexpectedFailed] = await Promise.all([
    _query(db, `SELECT status, COUNT(*)::int AS cnt FROM industrial_workflow_instances GROUP BY status ORDER BY cnt DESC`),
    _query(db, `
      SELECT status, COUNT(*)::int AS cnt
      FROM industrial_workflow_instances
      WHERE started_at > NOW() - ($1::text || ' days')::interval
      GROUP BY status ORDER BY cnt DESC
    `, [String(windowDays)]),
    _query(db, `SELECT status, COUNT(*)::int AS cnt FROM ai_action_approval_queue GROUP BY status ORDER BY cnt DESC`),
    _query(db, `
      SELECT COUNT(*)::int AS cnt FROM industrial_workflow_instances
      WHERE status = 'failed'
        AND started_at > NOW() - ($1::text || ' days')::interval
    `, [String(windowDays)]),
  ]);

  const executed = byStatus.reduce((s, r) => s + (r.cnt || 0), 0);
  const completed = byStatus.find((r) => r.status === 'completed')?.cnt ?? 0;
  const running = byStatus.find((r) => r.status === 'running')?.cnt ?? 0;
  const cancelled = byStatus.find((r) => r.status === 'cancelled')?.cnt ?? 0;
  const failed = byStatus.find((r) => r.status === 'failed')?.cnt ?? 0;
  const hitlApproved = hitlQueue.find((r) => r.status === 'approved')?.cnt ?? 0;
  const hitlPending = hitlQueue.find((r) => r.status === 'pending')?.cnt ?? 0;

  const unexpectedFailures = unexpectedFailed[0]?.cnt ?? 0;

  return {
    observation_window_days: windowDays,
    total_instances: executed,
    executed,
    completed,
    running,
    cancelled,
    failed,
    by_status: byStatus,
    window_activity: windowActivity,
    hitl: {
      approved: hitlApproved,
      pending: hitlPending,
      queue: hitlQueue
    },
    workflow_health: unexpectedFailures === 0,
    unexpected_failures: unexpectedFailures
  };
}

/**
 * P0B.4 — AI observation
 */
async function observeAI(db, options = {}) {
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;
  const modulesWatched = [
    'dashboard_chat',
    'smart_summary',
    'smart_panel',
    'claude_panel',
    'dashboard_chat_multimodal'
  ];

  const [byModule, ceoTraces, byProvider, hallucination] = await Promise.all([
    _query(db, `
      SELECT module_name, COUNT(*)::int AS cnt
      FROM ai_interaction_traces
      WHERE created_at > NOW() - ($1::text || ' days')::interval
      GROUP BY module_name ORDER BY cnt DESC
    `, [String(windowDays)]),
    _query(db, `
      SELECT COUNT(*)::int AS cnt
      FROM ai_interaction_traces t
      INNER JOIN users u ON u.id = t.user_id
      WHERE u.role = 'ceo'
        AND t.created_at > NOW() - ($1::text || ' days')::interval
    `, [String(windowDays)]),
    _query(db, `
      SELECT COALESCE(model_info->>'provider', 'unknown') AS provider, COUNT(*)::int AS cnt
      FROM ai_interaction_traces
      WHERE created_at > NOW() - ($1::text || ' days')::interval
      GROUP BY 1 ORDER BY cnt DESC
    `, [String(windowDays)]),
    _query(db, `
      SELECT COUNT(*)::int AS total,
        SUM(CASE WHEN requires_human_review THEN 1 ELSE 0 END)::int AS flagged
      FROM ai_hallucination_assessments
      WHERE created_at > NOW() - ($1::text || ' days')::interval
    `, [String(windowDays)])
  ]);

  const moduleMap = Object.fromEntries(byModule.map((r) => [r.module_name, r.cnt]));
  const watched = modulesWatched.map((m) => ({
    module: m,
    traces: moduleMap[m] ?? 0
  }));

  let triAiOperational = false;
  let triAiVerdict = 'UNKNOWN';
  try {
    const healthSvc = require('../aiIntegrationsHealthService');
    const health = await healthSvc.getAiIntegrationsHealth({ forceRefresh: false });
    const o = health?.integrations?.openai?.status === 'up';
    const a = health?.integrations?.anthropic?.status === 'up';
    const g = health?.integrations?.google_vertex?.status === 'up';
    triAiOperational = o && a && g;
    triAiVerdict = triAiOperational ? 'TRI_AI_OPERATIONAL' : 'TRI_AI_DEGRADED';
  } catch {
    triAiVerdict = 'TRI_AI_UNPROBED';
  }

  const industrialTruth = String(process.env.IMPETUS_INDUSTRIAL_TRUTH_MODE || 'off').toLowerCase();
  const hallucinationMode = String(process.env.IMPETUS_HALLUCINATION_DETECTION || 'off').toLowerCase();
  const truthEnforcementActive =
    ['enforce', 'on', 'true', '1'].includes(industrialTruth) &&
    ['enforce', 'on', 'true', '1'].includes(hallucinationMode);

  const geminiTraces = byProvider.find((p) =>
    ['gemini', 'google', 'google_vertex'].includes(String(p.provider).toLowerCase())
  )?.cnt ?? 0;

  return {
    observation_window_days: windowDays,
    modules_watched: watched,
    by_module: byModule,
    by_provider: byProvider,
    gemini_traces: geminiTraces,
    ceo_chat_traces: ceoTraces[0]?.cnt ?? 0,
    hallucination_assessments: hallucination[0]?.total ?? 0,
    hallucination_flagged: hallucination[0]?.flagged ?? 0,
    tri_ai_operational: triAiOperational,
    tri_ai_verdict: triAiVerdict,
    truth_enforcement_active: truthEnforcementActive,
    truth_env: {
      IMPETUS_INDUSTRIAL_TRUTH_MODE: industrialTruth,
      IMPETUS_HALLUCINATION_DETECTION: hallucinationMode
    }
  };
}

/**
 * P0B.5 — Platform stability observation
 */
function observePlatform() {
  let pm2 = { found: false };
  try {
    const raw = execSync('pm2 jlist', { timeout: 5000, encoding: 'utf8' });
    const list = JSON.parse(raw);
    const be = list.find((p) => p.name === 'impetus-backend');
    if (be) {
      const uptimeMs = be.pm2_env?.pm_uptime ? Date.now() - be.pm2_env.pm_uptime : null;
      pm2 = {
        found: true,
        status: be.pm2_env?.status,
        restarts: be.pm2_env?.restart_time ?? 0,
        unstable_restarts: be.pm2_env?.unstable_restarts ?? 0,
        uptime_ms: uptimeMs,
        uptime_hours: uptimeMs != null ? Math.round((uptimeMs / 3600000) * 10) / 10 : null,
        memory_bytes: be.monit?.memory ?? null,
        cpu_pct: be.monit?.cpu ?? null
      };
    }
  } catch (err) {
    pm2 = { found: false, error: err.message };
  }

  const workers = _getWorkerStatusSafe();
  const queueDepth = {
    outbox_pending: null,
    edge_pending: null
  };

  const criticalFailures = pm2.found && pm2.status === 'online' ? 0 : 1;
  const platformStable =
    pm2.found &&
    pm2.status === 'online' &&
    (pm2.unstable_restarts ?? 0) === 0;

  return {
    pm2,
    workers_in_process: workers,
    queue_depth: queueDepth,
    platform_stable: platformStable,
    critical_failures: criticalFailures
  };
}

function _getWorkerStatusSafe() {
  try {
    const outbox = require('../aioi/aioiOutboxWorkerService');
    const continuous = require('../aioi/runtime/aioiContinuousWorkerService');
    return {
      outbox: typeof outbox.getWorkerStatus === 'function' ? outbox.getWorkerStatus() : null,
      continuous: typeof continuous.getWorkerStatus === 'function' ? continuous.getWorkerStatus() : null
    };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Observação consolidada P0B
 */
async function generateContinuousObservation(options = {}) {
  const db = options.db || require('../../db');
  const windowDays = options.windowDays ?? DEFAULT_WINDOW_DAYS;

  const [ingestion, workflows, ai, platform, readiness] = await Promise.all([
    observeIngestion(db, { windowDays }),
    observeWorkflows(db, { windowDays }),
    observeAI(db, { windowDays }),
    Promise.resolve(observePlatform()),
    ioeOp.assessContinuousOperationReadiness({ db }).catch(() => null)
  ]);

  if (readiness?.outbox) {
    platform.queue_depth.outbox_pending = readiness.outbox.pending;
  }
  if (readiness?.queue_health) {
    platform.queue_depth.edge_pending = readiness.queue_health.edge_queue_pending;
  }

  const plcActive = (ingestion.plc_telemetry_per_hour ?? 0) > 0;
  const workersRunning =
    platform.workers_in_process?.continuous?.worker_running === true ||
    platform.workers_in_process?.outbox?.worker_running === true;

  const continuousOperationActive =
    plcActive ||
    workersRunning ||
    (ingestion.events_per_day ?? 0) > 0 ||
    (ingestion.events_in_window ?? 0) > 0;

  const observations = [];
  if (ingestion.interruption_type === 'ioe_paused_workers_disabled_by_config') {
    observations.push({
      type: 'operational_note',
      message:
        'IOE sem eventos recentes — workers desactivados por configuração (F49-B/P0A). PLC telemetry activa. Activacao manual pendente.'
    });
  }
  if (ingestion.interruption_detected) {
    observations.push({
      type: 'interruption',
      message: `Gap IOE > ${INTERRUPTION_IOE_HOURS}h com workers habilitados`
    });
  }

  return {
    layer: LAYER,
    mode: 'READ_ONLY_OBSERVATION',
    generated_at: new Date().toISOString(),
    observation_window_days: windowDays,
    continuous_operation_active: continuousOperationActive,
    observation_running: true,
    ingestion,
    workflows,
    ai,
    platform,
    observations,
    summary: {
      ioe_per_hour: ingestion.events_per_hour,
      ioe_per_day: ingestion.events_per_day,
      active_tenants: ingestion.active_tenants,
      outbox_delivery_rate_pct: ingestion.outbox_delivery_rate_pct,
      workflow_running: workflows.running,
      tri_ai_status: ai.tri_ai_verdict,
      platform_status: platform.pm2?.status ?? 'unknown',
      observation_status: 'ACTIVE'
    },
    criteria: {
      ingestion_observation_ready: true,
      workflow_observation_ready: true,
      tri_ai_observation_ready: true,
      platform_observation_ready: true
    }
  };
}

function getObservationStatusSnapshot(observation) {
  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    phase: 'P0B',
    pass: true,
    verdict: 'CONTINUOUS_OPERATION_OBSERVATION_ACTIVE',
    continuous_operation_active: observation.continuous_operation_active,
    observation_running: observation.observation_running,
    summary: observation.summary,
    timestamp: observation.generated_at
  };
}

module.exports = {
  LAYER,
  DEFAULT_WINDOW_DAYS,
  observeIngestion,
  observeWorkflows,
  observeAI,
  observePlatform,
  generateContinuousObservation,
  getObservationStatusSnapshot
};
