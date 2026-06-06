'use strict';

/**
 * AIOI-P3.5 — Intelligence Health Service (READ ONLY)
 *
 * Saúde global via composição P3.0–P3.4 (getValueGovernanceReadModel).
 */

const { isValidUUID } = require('../../utils/security');
const susMetrics = require('./aioiSustainabilityMetrics');
const valueGovernanceReadModel = require('./aioiValueGovernanceReadModelService');

const HEALTH_PILLARS = Object.freeze([
  'trust', 'assurance', 'auditability', 'readiness', 'value_governance'
]);

function computeHealthScore(vgrm) {
  const signals = susMetrics._extractGovernanceSignals(vgrm);
  const values = HEALTH_PILLARS.map(k => {
    switch (k) {
      case 'trust':            return signals.trustScore;
      case 'assurance':          return signals.assuranceScore;
      case 'auditability':       return signals.auditabilityScore;
      case 'readiness':          return signals.readinessScore;
      case 'value_governance':   return signals.valueGovernanceScore;
      default:                   return null;
    }
  }).filter(v => v != null);

  if (!values.length) return 30;
  return susMetrics.clampScore(values.reduce((s, v) => s + v, 0) / values.length);
}

function buildIntelligenceHealth(vgrm) {
  const health_score = computeHealthScore(vgrm);
  return {
    health_score,
    health_status: susMetrics.classifyHealthStatus(health_score)
  };
}

async function getIntelligenceHealth(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const vgRes = await valueGovernanceReadModel.getValueGovernanceReadModel(companyId);
    if (!vgRes.ok) {
      susMetrics.recordError(companyId, 'getIntelligenceHealth', vgRes.error);
      return { ok: false, error: vgRes.error };
    }

    const intelligence_health = buildIntelligenceHealth(vgRes.value_governance_read_model);
    susMetrics.recordHealthAnalyzed(companyId);
    return { ok: true, intelligence_health };

  } catch (err) {
    susMetrics.recordError(companyId, 'getIntelligenceHealth', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  HEALTH_PILLARS,
  computeHealthScore,
  buildIntelligenceHealth,
  getIntelligenceHealth
};
