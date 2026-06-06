'use strict';

/**
 * AIOI-P3.5 — Enterprise Sustainability Service (READ ONLY)
 *
 * Score composto: health + continuity + value sustainability + trust.
 */

const { isValidUUID } = require('../../utils/security');
const susMetrics = require('./aioiSustainabilityMetrics');
const healthService = require('./aioiIntelligenceHealthService');
const continuityService = require('./aioiGovernanceContinuityService');
const valueSustainabilityService = require('./aioiValueSustainabilityService');
const valueGovernanceReadModel = require('./aioiValueGovernanceReadModelService');

const ENTERPRISE_SUSTAINABILITY_WEIGHTS = Object.freeze({
  health:              0.25,
  continuity:          0.25,
  valueSustainability: 0.25,
  trust:               0.25
});

function computeEnterpriseSustainabilityScore({ healthScore, continuityScore, valueSustainabilityScore, trustScore }) {
  const raw =
    (healthScore ?? 50) * ENTERPRISE_SUSTAINABILITY_WEIGHTS.health +
    (continuityScore ?? 50) * ENTERPRISE_SUSTAINABILITY_WEIGHTS.continuity +
    (valueSustainabilityScore ?? 50) * ENTERPRISE_SUSTAINABILITY_WEIGHTS.valueSustainability +
    (trustScore ?? 50) * ENTERPRISE_SUSTAINABILITY_WEIGHTS.trust;
  return susMetrics.clampScore(raw);
}

function buildEnterpriseSustainability(signals) {
  const enterprise_sustainability_score = computeEnterpriseSustainabilityScore(signals);
  return {
    enterprise_sustainability_score,
    enterprise_sustainability_level: susMetrics.classifyEnterpriseSustainabilityLevel(
      enterprise_sustainability_score
    )
  };
}

async function getEnterpriseSustainability(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const vgRes = await valueGovernanceReadModel.getValueGovernanceReadModel(companyId);
    if (!vgRes.ok) {
      susMetrics.recordError(companyId, 'getEnterpriseSustainability', vgRes.error);
      return { ok: false, error: vgRes.error };
    }

    const vgrm = vgRes.value_governance_read_model;
    const signals = susMetrics._extractGovernanceSignals(vgrm);

    const enterprise_sustainability = buildEnterpriseSustainability({
      healthScore:              healthService.computeHealthScore(vgrm),
      continuityScore:          continuityService.computeContinuityScore(vgrm),
      valueSustainabilityScore: valueSustainabilityService.computeValueSustainabilityScore(vgrm),
      trustScore:               signals.trustScore
    });

    susMetrics.recordEnterpriseSustainabilityAnalyzed(companyId);
    return { ok: true, enterprise_sustainability };

  } catch (err) {
    susMetrics.recordError(companyId, 'getEnterpriseSustainability', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ENTERPRISE_SUSTAINABILITY_WEIGHTS,
  computeEnterpriseSustainabilityScore,
  buildEnterpriseSustainability,
  getEnterpriseSustainability
};
