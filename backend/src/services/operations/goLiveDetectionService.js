'use strict';

/**
 * P0E.1 — Go-Live Detection Service
 * READ ONLY · OBSERVATIONAL ONLY
 */

const checkpoint = require('../audit/ioeContinuousIngestionCheckpointService');

const LAYER = 'P0E_GO_LIVE_DETECTION';

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
      continuous: typeof continuous.getWorkerStatus === 'function' ? continuous.getWorkerStatus() : null
    };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Detecta go-live real após activação manual do operador.
 */
async function detectGoLive(db, options = {}) {
  const envFileVars = checkpoint.readEnvFile(options.envPath);
  const envCheck = checkpoint.checkEnvConfiguration(envFileVars);
  const bootLog = checkpoint.parseBootLogEvidence(options.logPath);
  const liveRuntime = await checkpoint.checkLiveRuntime(options.apiBase);
  const workers = _getWorkerStatusSafe();

  const pipelineEnabled =
    envCheck.summary.outbox_worker_enabled &&
    envCheck.summary.continuous_ingestion_enabled &&
    envCheck.summary.event_pipeline_env_enabled;

  const workersActive =
    workers?.continuous?.worker_running === true ||
    workers?.outbox?.worker_running === true ||
    liveRuntime?.continuous_worker_running === true;

  const pipelineActive =
    bootLog.event_pipeline_boot_ok &&
    bootLog.outbox_worker_boot_active &&
    bootLog.continuous_worker_boot_active;

  if (!pipelineEnabled) {
    return {
      go_live_detected: false,
      activation_timestamp: null,
      pipeline_activated: false,
      workers_active: false,
      first_ioe_at: null,
      first_outbox_delivery_at: null,
      reason: 'AWAITING_OPERATOR_ACTIVATION',
      flags: {
        IMPETUS_AIOI_OUTBOX_WORKER_ENABLED: false,
        IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED: false,
        IMPETUS_EVENT_PIPELINE_ENABLED: envCheck.summary.event_pipeline_env_enabled
      }
    };
  }

  const activationSince = options.activationSince || null;

  const [firstIoe, firstDelivery, recentIoe] = await Promise.all([
    _query(db, `
      SELECT MIN(created_at) AS ts FROM industrial_operational_events
      WHERE created_at > COALESCE($1::timestamptz, NOW() - INTERVAL '7 days')
    `, [activationSince]),
    _query(db, `
      SELECT MIN(processed_at) AS ts FROM aioi_outbox
      WHERE status = 'delivered'
        AND processed_at > COALESCE($1::timestamptz, NOW() - INTERVAL '7 days')
    `, [activationSince]),
    _query(db, `
      SELECT COUNT(*)::int AS cnt FROM industrial_operational_events
      WHERE created_at > NOW() - INTERVAL '1 hour'
    `)
  ]);

  const firstIoeAt = firstIoe[0]?.ts ?? null;
  const firstDeliveryAt = firstDelivery[0]?.ts ?? null;
  const hasRecentIoe = (recentIoe[0]?.cnt ?? 0) > 0;

  const goLiveDetected =
    pipelineEnabled &&
    (workersActive || pipelineActive) &&
    (hasRecentIoe || firstIoeAt != null);

  const activationTimestamp =
    firstIoeAt ||
    (liveRuntime?.last_run_at ? new Date(liveRuntime.last_run_at).toISOString() : null) ||
    (pipelineActive ? new Date().toISOString() : null);

  return {
    go_live_detected: goLiveDetected,
    activation_timestamp: goLiveDetected ? activationTimestamp : null,
    pipeline_activated: pipelineEnabled && (pipelineActive || workersActive),
    workers_active: workersActive,
    pipeline_active: pipelineActive,
    first_ioe_at: firstIoeAt,
    first_outbox_delivery_at: firstDeliveryAt,
    recent_ioe_last_hour: recentIoe[0]?.cnt ?? 0,
    reason: goLiveDetected ? null : pipelineEnabled ? 'PIPELINE_ENABLED_AWAITING_FIRST_IOE' : 'AWAITING_OPERATOR_ACTIVATION',
    boot_evidence: {
      event_pipeline_boot_ok: bootLog.event_pipeline_boot_ok,
      outbox_worker_boot_active: bootLog.outbox_worker_boot_active,
      continuous_worker_boot_active: bootLog.continuous_worker_boot_active
    },
    live_runtime: liveRuntime
  };
}

module.exports = {
  LAYER,
  detectGoLive
};
