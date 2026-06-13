'use strict';

/**
 * AIOI-P5.3 — Audit Trail Consolidation Service
 *
 * Consolida trilhas de auditoria operacionais — READ ONLY, sem alterar histórico.
 * Spec: backend/docs/AIOI_AUDIT_TRAIL_SPECIFICATION.md
 */

const operationalTelemetry = require('./aioiOperationalTelemetryService');
const productionStability = require('./aioiProductionStabilityService');
const consumerMetrics = require('./aioiConsumerMetrics');
const executionMetrics = require('./aioiExecutionMetrics');
const decisionMetrics = require('./aioiDecisionMetrics');
const learningMetrics = require('./aioiLearningMetrics');
const outcomeMetrics = require('./aioiOutcomeMetrics');
const pilotFlags = require('./aioiPilotFlags');

const LAYER = 'AIOI_AUDIT_TRAIL';

/**
 * Consolida trilhas de auditoria de todas as camadas operacionais.
 * @returns {object}
 */
function getConsolidatedAuditTrail() {
  const stability = productionStability.getStabilitySnapshot();
  const telemetryEvents = operationalTelemetry.getRecentEvents(50);
  const pilotValidation = pilotFlags.validatePilotConfig();

  const workflowAudit = {
    source:       'aioiClassificationConsumerService',
    layer:        'classification',
    session:      consumerMetrics.getSessionCounters(),
    events:       telemetryEvents.filter(e => e.event?.includes('classification') || e.component === 'outbox_worker')
  };

  const executionAudit = {
    source:  'aioiExecutionBridgeService',
    layer:   'execution',
    session: executionMetrics.getSessionCounters()
  };

  const learningAudit = {
    source:  'aioiLearningBridgeService',
    layer:   'learning',
    session: learningMetrics.getSessionCounters()
  };

  const outcomeAudit = {
    source:  'aioiOutcomeTrackingService',
    layer:   'outcome',
    session: outcomeMetrics.getSessionCounters?.() || {}
  };

  const workerAudit = {
    source:            'aioiOutboxWorkerService',
    layer:             'worker',
    processing_cycles: stability.processing_cycles,
    failed_cycles:     stability.failed_cycles,
    restart_count:     stability.restart_count,
    uptime_hours:      stability.worker_uptime_hours
  };

  const healthAudit = {
    source:              'aioiOperationalHealthService',
    layer:               'health',
    health_transitions:  stability.health_transitions,
    transition_count:    stability.health_transition_count
  };

  const tenantAudit = {
    source:         'aioiPilotFlags',
    layer:          'tenant',
    pilot_tenants:  pilotValidation.pilot_tenants,
    config_ok:      pilotValidation.ok,
    config_errors:  pilotValidation.errors
  };

  const decisionAudit = {
    source:  'aioiDecisionBridgeService',
    layer:   'decision',
    session: decisionMetrics.getSessionCounters()
  };

  return {
    ok: true,
    layer: LAYER,
    workflow_audit:   workflowAudit,
    execution_audit:  executionAudit,
    learning_audit:   learningAudit,
    outcome_audit:    outcomeAudit,
    worker_audit:     workerAudit,
    health_audit:       healthAudit,
    tenant_audit:     tenantAudit,
    decision_audit:   decisionAudit,
    telemetry_event_count: telemetryEvents.length,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  getConsolidatedAuditTrail,
  LAYER
};
