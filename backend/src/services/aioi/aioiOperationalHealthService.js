'use strict';

/**
 * AIOI-P2.4 — Operational Health Service
 *
 * Health & readiness para operações piloto AIOI.
 * Sem reconstruir filas. Sem F47. Sem IA.
 */

const pilotFlags = require('./aioiPilotFlags');
const operationalMetrics = require('./aioiOperationalMetricsService');
const operationalTelemetry = require('./aioiOperationalTelemetryService');
const productionStability = require('./aioiProductionStabilityService');

const LAYER = 'AIOI_OPERATIONAL_HEALTH';

const FAILED_DEGRADED_THRESHOLD = 50;
let _lastHealthStatus = null;

/**
 * Resolve status operacional agregado.
 * @param {object} params
 * @returns {string}
 */
function _resolveStatus({ flags, workerStatus, outboxFailed, pilotOk }) {
  if (!flags.IMPETUS_AIOI_ENABLED) {
    return 'STANDBY';
  }

  if (flags.IMPETUS_AIOI_OUTBOX_WORKER_ENABLED && !workerStatus.worker_running) {
    return 'DEGRADED';
  }

  if (!pilotOk) {
    return 'DEGRADED';
  }

  if (outboxFailed >= FAILED_DEGRADED_THRESHOLD) {
    return 'DEGRADED';
  }

  return 'HEALTHY';
}

/**
 * Snapshot de health para GET /api/aioi/health.
 * @returns {Promise<object>}
 */
async function getHealthSnapshot() {
  const flags = pilotFlags.getAioiFlags();
  const outboxWorker = require('./aioiOutboxWorkerService');
  const workerStatus = outboxWorker.getWorkerStatus();
  const pilotValidation = pilotFlags.validatePilotConfig();
  const metrics = await operationalMetrics.getOperationalMetrics();

  const status = _resolveStatus({
    flags,
    workerStatus,
    outboxFailed: metrics.outbox_failed,
    pilotOk: pilotValidation.ok || !flags.IMPETUS_AIOI_OUTBOX_WORKER_ENABLED
  });

  const snapshot = {
    aioi_enabled:     flags.IMPETUS_AIOI_ENABLED,
    queue_active:     flags.IMPETUS_AIOI_QUEUE_ACTIVE,
    worker_running:   workerStatus.worker_running,
    outbox_pending:   metrics.outbox_pending,
    outbox_failed:    metrics.outbox_failed,
    dlq_count:        metrics.dlq_count,
    status
  };

  operationalTelemetry.emitHealthEvent('health_snapshot', snapshot);

  if (_lastHealthStatus && _lastHealthStatus !== status) {
    productionStability.recordHealthTransition(_lastHealthStatus, status);
  }
  _lastHealthStatus = status;

  return {
    ok: true,
    ...snapshot,
    worker_enabled: flags.IMPETUS_AIOI_OUTBOX_WORKER_ENABLED,
    pilot_tenant_count: pilotValidation.pilot_tenants.length,
    captured_at: new Date().toISOString()
  };
}

/**
 * Readiness detalhado (ops interno).
 * @returns {Promise<object>}
 */
async function getReadinessDetail() {
  const health = await getHealthSnapshot();
  const metrics = await operationalMetrics.getOperationalMetrics();
  const outboxWorker = require('./aioiOutboxWorkerService');
  const workerStatus = outboxWorker.getWorkerStatus();
  const pilotValidation = pilotFlags.validatePilotConfig();

  return {
    ...health,
    metrics,
    worker: workerStatus,
    pilot: pilotValidation,
    invariants: {
      runtime_enabled: false,
      runtime_active: false,
      runtime_authorized: false,
      cognitive_execution_allowed: false
    }
  };
}

module.exports = {
  getHealthSnapshot,
  getReadinessDetail,
  LAYER
};
