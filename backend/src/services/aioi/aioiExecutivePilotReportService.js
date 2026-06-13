'use strict';

/**
 * AIOI-P3.6 — Executive Pilot Report Service
 *
 * Relatório CEO read-only do piloto operacional AIOI.
 * Sem modificar workflow. Sem IA.
 */

const pilotFlags = require('./aioiPilotFlags');
const operationalEvidence = require('./aioiOperationalEvidenceService');
const slaCompliance = require('./aioiSlaComplianceService');
const productionStability = require('./aioiProductionStabilityService');
const operationalHealth = require('./aioiOperationalHealthService');

const LAYER = 'AIOI_EXECUTIVE_PILOT_REPORT';

/**
 * Gera relatório executivo completo do piloto.
 * @returns {Promise<object>}
 */
async function generateExecutivePilotReport() {
  const [evidence, sla, stability, health] = await Promise.all([
    operationalEvidence.collectOperationalEvidence(),
    slaCompliance.getSlaComplianceSnapshot(),
    Promise.resolve(productionStability.getStabilitySnapshot()),
    operationalHealth.getHealthSnapshot()
  ]);

  const pilotValidation = pilotFlags.validatePilotConfig();

  const executivePilotSummary = {
    aioi_enabled:       health.aioi_enabled,
    queue_active:       health.queue_active,
    worker_running:     health.worker_running,
    health_status:      health.status,
    pilot_tenant_count: pilotValidation.pilot_tenants.length,
    pilot_config_ok:    pilotValidation.ok,
    ioe_total:          evidence.pipeline.ioe_total,
    error_rate_pct:     evidence.error_rate_pct
  };

  const operationalThroughput = {
    classification_rate: evidence.throughput.classification_rate,
    decision_rate:       evidence.throughput.decision_rate,
    execution_rate:      evidence.throughput.execution_rate,
    learning_rate:       evidence.throughput.learning_rate,
    outbox_delivered:    evidence.throughput.outbox_delivered
  };

  const slaComplianceSummary = {
    sla_total:           sla.sla_total,
    sla_on_track:        sla.sla_on_track,
    sla_at_risk:         sla.sla_at_risk,
    sla_breached:        sla.sla_breached,
    sla_compliance_rate: sla.sla_compliance_rate,
    priority_distribution: sla.priority_distribution,
    breach_distribution:   sla.breach_distribution
  };

  const dlqSummary = {
    dlq_count:           evidence.outbox.dlq_count,
    outbox_failed:       evidence.outbox.failed,
    dlq_utilization_pct: evidence.dlq_utilization_pct,
    outbox_pending:      evidence.outbox.pending
  };

  const healthSummary = {
    status:           health.status,
    worker_running:   health.worker_running,
    outbox_pending:   health.outbox_pending,
    outbox_failed:    health.outbox_failed,
    dlq_count:        health.dlq_count
  };

  const tenantSummary = {
    pilot_tenants:     pilotValidation.pilot_tenants,
    tenant_count:      pilotValidation.pilot_tenants.length,
    max_allowed:       pilotFlags.MAX_PILOT_TENANTS,
    config_errors:     pilotValidation.errors
  };

  return {
    ok: true,
    layer: LAYER,
    executive_pilot_summary:     executivePilotSummary,
    operational_throughput:      operationalThroughput,
    sla_compliance_summary:      slaComplianceSummary,
    dlq_summary:                 dlqSummary,
    health_summary:              healthSummary,
    tenant_summary:              tenantSummary,
    stability:                   stability,
    evidence_captured_at:        evidence.captured_at,
    generated_at:                new Date().toISOString()
  };
}

module.exports = {
  generateExecutivePilotReport,
  LAYER
};
