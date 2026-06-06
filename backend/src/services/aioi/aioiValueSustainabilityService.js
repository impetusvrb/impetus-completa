'use strict';

/**
 * AIOI-P3.5 — Value Sustainability Service (READ ONLY)
 *
 * Sustentabilidade do valor via P3.4 Value Governance, P3.3 Readiness, P3.0 Trust.
 */

const { isValidUUID } = require('../../utils/security');
const susMetrics = require('./aioiSustainabilityMetrics');
const valueGovernanceReadModel = require('./aioiValueGovernanceReadModelService');

const VALUE_SUSTAINABILITY_PILLARS = Object.freeze([
  'value_governance', 'readiness', 'trust'
]);

function computeValueSustainabilityScore(vgrm) {
  const signals = susMetrics._extractGovernanceSignals(vgrm);
  const values = [
    signals.valueGovernanceScore,
    signals.readinessScore,
    signals.trustScore
  ].filter(v => v != null);

  if (!values.length) return 30;
  return susMetrics.clampScore(values.reduce((s, v) => s + v, 0) / values.length);
}

function buildValueSustainability(vgrm) {
  const sustainability_score = computeValueSustainabilityScore(vgrm);
  return {
    sustainability_score,
    sustainability_status: susMetrics.classifyValueSustainabilityStatus(sustainability_score)
  };
}

async function getValueSustainability(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const vgRes = await valueGovernanceReadModel.getValueGovernanceReadModel(companyId);
    if (!vgRes.ok) {
      susMetrics.recordError(companyId, 'getValueSustainability', vgRes.error);
      return { ok: false, error: vgRes.error };
    }

    const value_sustainability = buildValueSustainability(vgRes.value_governance_read_model);
    susMetrics.recordValueSustainabilityAnalyzed(companyId);
    return { ok: true, value_sustainability };

  } catch (err) {
    susMetrics.recordError(companyId, 'getValueSustainability', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  VALUE_SUSTAINABILITY_PILLARS,
  computeValueSustainabilityScore,
  buildValueSustainability,
  getValueSustainability
};
