'use strict';

/**
 * AIOI-P4.2 — Enterprise Consumption Service (READ ONLY)
 *
 * Score composto: visibility + decision consumption + accessibility + enterprise autonomy.
 */

const { isValidUUID } = require('../../utils/security');
const consumptionMetrics = require('./aioiConsumptionMetrics');
const visibilityService = require('./aioiExecutiveVisibilityService');
const decisionService = require('./aioiDecisionConsumptionService');
const accessibilityService = require('./aioiIntelligenceAccessibilityService');
const autonomyReadModel = require('./aioiAutonomyReadModelService');

const ENTERPRISE_CONSUMPTION_WEIGHTS = Object.freeze({
  executiveVisibility:        0.25,
  decisionConsumption:        0.25,
  intelligenceAccessibility:  0.25,
  enterpriseAutonomy:         0.25
});

function computeEnterpriseConsumptionScore({
  visibilityScore, decisionConsumptionScore, accessibilityScore, enterpriseAutonomyScore
}) {
  const raw =
    (visibilityScore ?? 50) * ENTERPRISE_CONSUMPTION_WEIGHTS.executiveVisibility +
    (decisionConsumptionScore ?? 50) * ENTERPRISE_CONSUMPTION_WEIGHTS.decisionConsumption +
    (accessibilityScore ?? 50) * ENTERPRISE_CONSUMPTION_WEIGHTS.intelligenceAccessibility +
    (enterpriseAutonomyScore ?? 50) * ENTERPRISE_CONSUMPTION_WEIGHTS.enterpriseAutonomy;
  return consumptionMetrics.clampScore(raw);
}

function buildEnterpriseConsumption(signals) {
  const consumption_score = computeEnterpriseConsumptionScore(signals);
  return {
    consumption_score,
    consumption_level: consumptionMetrics.classifyEnterpriseConsumption(consumption_score)
  };
}

async function getEnterpriseConsumption(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const armRes = await autonomyReadModel.getAutonomyReadModel(companyId);
    if (!armRes.ok) {
      consumptionMetrics.recordError(companyId, 'getEnterpriseConsumption', armRes.error);
      return { ok: false, error: armRes.error };
    }

    const arm = armRes.autonomy_read_model;
    const extracted = consumptionMetrics._extractConsumptionSignals(arm);

    const enterprise_consumption = buildEnterpriseConsumption({
      visibilityScore:           visibilityService.computeExecutiveVisibilityScore(arm),
      decisionConsumptionScore:  decisionService.computeDecisionConsumptionScore(arm),
      accessibilityScore:        accessibilityService.computeIntelligenceAccessibilityScore(arm),
      enterpriseAutonomyScore:   extracted.autonomyScore
    });

    consumptionMetrics.recordEnterpriseConsumptionAnalyzed(companyId);
    return { ok: true, enterprise_consumption };

  } catch (err) {
    consumptionMetrics.recordError(companyId, 'getEnterpriseConsumption', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ENTERPRISE_CONSUMPTION_WEIGHTS,
  computeEnterpriseConsumptionScore,
  buildEnterpriseConsumption,
  getEnterpriseConsumption
};
