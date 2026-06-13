'use strict';

/**
 * AIOI-P10.1 — Cognitive Observation Service
 *
 * Observações estruturadas — agregação observacional only.
 * Spec: backend/docs/AIOI_COGNITIVE_OBSERVATION_SPECIFICATION.md
 */

const crypto = require('crypto');
const operationalEvidence = require('./aioiOperationalEvidenceService');
const slaCompliance = require('./aioiSlaComplianceService');
const operationalRiskRegister = require('./aioiOperationalRiskRegisterService');
const complianceAnalytics = require('./aioiComplianceAnalyticsService');
const decisionIntelligence = require('./aioiDecisionIntelligenceService');
const tenantCapacity = require('./aioiTenantCapacityService');

const LAYER = 'AIOI_COGNITIVE_OBSERVATION';

function _observationId(category, index) {
  const hash = crypto.createHash('sha256')
    .update(`${category}:${index}:${new Date().toISOString().slice(0, 10)}`)
    .digest('hex')
    .slice(0, 16);
  return `OBS-${category.toUpperCase()}-${hash}`;
}

function _buildObservation({ category, sourceDomains, text, evidenceSources }) {
  const idx = evidenceSources.length;
  return {
    observation_id:   _observationId(category, idx),
    category,
    source_domains:   sourceDomains,
    observation_text: text,
    evidence_sources: evidenceSources,
    interpretation_free: true,
    generated_at:     new Date().toISOString()
  };
}

/**
 * Gera observações estruturadas sobre domínios operacionais.
 * @returns {Promise<object>}
 */
async function generateStructuredObservations() {
  const [evidence, sla, risk, compliance, decision, capacity] = await Promise.all([
    operationalEvidence.collectOperationalEvidence(),
    slaCompliance.getSlaComplianceSnapshot(),
    operationalRiskRegister.getOperationalRiskRegister(),
    complianceAnalytics.getComplianceAnalytics(),
    decisionIntelligence.aggregateDecisionIntelligence(),
    tenantCapacity.getTenantCapacitySnapshot()
  ]);

  const observations = [];

  observations.push(_buildObservation({
    category: 'throughput',
    sourceDomains: ['aioiOperationalEvidenceService', 'aioiOperationalMetricsService'],
    text: `Throughput observado: outbox_delivered=${evidence.throughput.outbox_delivered}, classification_rate=${evidence.throughput.classification_rate}, decision_rate=${evidence.throughput.decision_rate}.`,
    evidenceSources: [
      { type: 'metrics', source: 'aioiOperationalEvidenceService', field: 'throughput' }
    ]
  }));

  observations.push(_buildObservation({
    category: 'sla',
    sourceDomains: ['aioiSlaComplianceService'],
    text: `SLA observado: compliance_rate=${sla.sla_compliance_rate}, breached=${sla.sla_breached}, at_risk=${sla.sla_at_risk}.`,
    evidenceSources: [
      { type: 'snapshot', source: 'aioiSlaComplianceService', field: 'sla_compliance_rate' }
    ]
  }));

  observations.push(_buildObservation({
    category: 'risk',
    sourceDomains: ['aioiOperationalRiskRegisterService'],
    text: `Risco observado: risk_score=${risk.risk_score}, risk_level=${risk.risk_level}, risk_trend=${risk.risk_trend}.`,
    evidenceSources: [
      { type: 'register', source: 'aioiOperationalRiskRegisterService', field: 'risk_score' }
    ]
  }));

  observations.push(_buildObservation({
    category: 'compliance',
    sourceDomains: ['aioiComplianceAnalyticsService'],
    text: `Compliance observado: overall_score=${compliance.overall_compliance_score}, governance_compliance=${compliance.governance_compliance}.`,
    evidenceSources: [
      { type: 'analytics', source: 'aioiComplianceAnalyticsService', field: 'overall_compliance_score' }
    ]
  }));

  observations.push(_buildObservation({
    category: 'decision',
    sourceDomains: ['aioiDecisionIntelligenceService'],
    text: `Decisão observada: ioe_total=${decision.operational_history.ioe_total}, with_decision=${decision.operational_history.with_decision}, with_outcome=${decision.operational_history.with_outcome}.`,
    evidenceSources: [
      { type: 'intelligence', source: 'aioiDecisionIntelligenceService', field: 'operational_history' }
    ]
  }));

  observations.push(_buildObservation({
    category: 'capacity',
    sourceDomains: ['aioiTenantCapacityService'],
    text: `Capacidade observada: pilot_tenant_count=${capacity.pilot_tenant_count}, avg_saturation=${capacity.aggregate.avg_saturation_score}, sla_pressure=${capacity.aggregate.sla_pressure_total}.`,
    evidenceSources: [
      { type: 'snapshot', source: 'aioiTenantCapacityService', field: 'aggregate.avg_saturation_score' }
    ]
  }));

  return {
    ok: true,
    layer: LAYER,
    observations,
    observation_count: observations.length,
    categories: [...new Set(observations.map(o => o.category))],
    interpretation_free: true,
    captured_at: new Date().toISOString()
  };
}

module.exports = {
  generateStructuredObservations,
  LAYER
};
