'use strict';

/**
 * P0E.4 — Production Acceptance Service
 * READ ONLY · VALIDATION ONLY
 */

const goLive = require('./goLiveDetectionService');
const firstDay = require('./firstDayMonitoringService');
const threeDay = require('./threeDayMonitoringService');
const ioeOp = require('./ioeContinuousOperationService');

const LAYER = 'P0E_PRODUCTION_ACCEPTANCE';

/**
 * Validação completa de aceitação de produção contínua.
 */
async function generateProductionAcceptance(options = {}) {
  const db = options.db || require('../../db');

  const detection = await goLive.detectGoLive(db, options);
  const activationSince = detection.activation_timestamp || null;

  if (!detection.go_live_detected) {
    return {
      layer: LAYER,
      mode: 'READ_ONLY_OBSERVATIONAL',
      generated_at: new Date().toISOString(),
      phase: 'P0E',
      pass: false,
      verdict: 'GO_LIVE_PENDING',
      reason: detection.reason || 'CONTINUOUS_RUNTIME_NOT_ACTIVATED',
      go_live: detection,
      operator_steps_required: [
        'IMPETUS_AIOI_OUTBOX_WORKER_ENABLED=true',
        'IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED=true',
        'IMPETUS_EVENT_PIPELINE_ENABLED=true',
        'pm2 restart impetus-backend --update-env',
        'Aguardar primeiro IOE e re-executar GET /api/operations/golive/status'
      ],
      first_24h: null,
      first_72h: null,
      criteria: {
        go_live_detected: false,
        first_24h_stable: false,
        first_72h_stable: false,
        production_accepted: false,
        dashboard_ready: true,
        api_ready: true
      },
      summary: {
        activation_status: 'PENDING',
        runtime_uptime_hours: null,
        ioe_per_hour: 0,
        deliveries_per_hour: 0,
        active_tenants: 0,
        backlog: 0,
        pm2_health: 'UNKNOWN',
        acceptance_status: 'PENDING'
      }
    };
  }

  const [day24, day72, queueHealth] = await Promise.all([
    firstDay.monitorFirst24Hours(db, { since: activationSince }),
    threeDay.monitorFirst72Hours(db, { since: activationSince }),
    ioeOp.validateQueueHealth(db).catch(() => ({ queue_healthy: false }))
  ]);

  const productionAccepted =
    detection.go_live_detected &&
    day24.first_24h_stable &&
    day72.first_72h_stable &&
    (queueHealth.queue_healthy !== false) &&
    day24.failed_total === 0;

  const pass = productionAccepted;

  return {
    layer: LAYER,
    mode: 'READ_ONLY_OBSERVATIONAL',
    generated_at: new Date().toISOString(),
    phase: 'P0E',
    pass,
    verdict: pass
      ? 'CONTINUOUS_OPERATION_GO_LIVE_ACCEPTED'
      : 'GO_LIVE_MONITORING_IN_PROGRESS',
    reason: pass ? null : 'GO_LIVE_DETECTED_BUT_ACCEPTANCE_CRITERIA_PENDING',
    go_live: detection,
    first_24h: day24,
    first_72h: day72,
    queue_health: queueHealth,
    production_accepted: productionAccepted,
    criteria: {
      go_live_detected: detection.go_live_detected,
      first_24h_stable: day24.first_24h_stable,
      first_72h_stable: day72.first_72h_stable,
      production_accepted: productionAccepted,
      dashboard_ready: true,
      api_ready: true
    },
    summary: {
      activation_status: 'LIVE',
      activation_timestamp: detection.activation_timestamp,
      runtime_uptime_hours: day24.pm2?.uptime_hours ?? null,
      ioe_per_hour: day24.ioe_per_hour,
      deliveries_per_hour: day24.deliveries_per_hour,
      active_tenants: day72.active_tenants,
      backlog: day24.backlog_pending,
      pm2_health: day24.pm2?.status === 'online' ? 'OK' : 'DEGRADED',
      acceptance_status: productionAccepted ? 'ACCEPTED' : 'MONITORING'
    }
  };
}

function getGoLiveStatusSnapshot(report) {
  return {
    ok: report.pass,
    layer: LAYER,
    read_only: true,
    phase: 'P0E',
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
  generateProductionAcceptance,
  getGoLiveStatusSnapshot
};
