'use strict';

/**
 * AIOI-P4.2 — Consumption Read Model Service (READ ONLY)
 *
 * Agregador P4.1 + capacidades P4.2 — getAutonomyReadModel uma única vez.
 */

const { isValidUUID } = require('../../utils/security');
const consumptionMetrics = require('./aioiConsumptionMetrics');
const autonomyReadModel = require('./aioiAutonomyReadModelService');
const visibilityService = require('./aioiExecutiveVisibilityService');
const decisionService = require('./aioiDecisionConsumptionService');
const accessibilityService = require('./aioiIntelligenceAccessibilityService');
const enterpriseConsumptionService = require('./aioiEnterpriseConsumptionService');

async function getConsumptionReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  consumptionMetrics.recordConsumptionRequested(companyId);
  const startMs = Date.now();

  try {
    const armRes = await autonomyReadModel.getAutonomyReadModel(companyId);
    if (!armRes.ok) {
      consumptionMetrics.recordError(companyId, 'getConsumptionReadModel', armRes.error);
      return { ok: false, error: armRes.error };
    }

    const arm = armRes.autonomy_read_model;
    const signals = consumptionMetrics._extractConsumptionSignals(arm);

    const executive_visibility = visibilityService.buildExecutiveVisibility(arm);
    const decision_consumption = decisionService.buildDecisionConsumption(arm);
    const intelligence_accessibility = accessibilityService.buildIntelligenceAccessibility(arm);

    const enterprise_consumption = enterpriseConsumptionService.buildEnterpriseConsumption({
      visibilityScore:           executive_visibility.visibility_score,
      decisionConsumptionScore:  decision_consumption.consumption_score,
      accessibilityScore:        intelligence_accessibility.accessibility_score,
      enterpriseAutonomyScore:   signals.autonomyScore
    });

    const [
      visibilityRes,
      decisionRes,
      accessibilityRes,
      enterpriseRes
    ] = await Promise.all([
      Promise.resolve({ ok: true, executive_visibility }),
      Promise.resolve({ ok: true, decision_consumption }),
      Promise.resolve({ ok: true, intelligence_accessibility }),
      Promise.resolve({ ok: true, enterprise_consumption })
    ]);

    consumptionMetrics.recordExecutiveVisibilityAnalyzed(companyId);
    consumptionMetrics.recordDecisionConsumptionAnalyzed(companyId);
    consumptionMetrics.recordIntelligenceAccessibilityAnalyzed(companyId);
    consumptionMetrics.recordEnterpriseConsumptionAnalyzed(companyId);
    consumptionMetrics.recordConsumptionCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      consumption_read_model: {
        autonomy_read_model:          arm,
        executive_visibility:         visibilityRes.executive_visibility,
        decision_consumption:           decisionRes.decision_consumption,
        intelligence_accessibility:     accessibilityRes.intelligence_accessibility,
        enterprise_consumption:         enterpriseRes.enterprise_consumption
      }
    };

  } catch (err) {
    consumptionMetrics.recordError(companyId, 'getConsumptionReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getConsumptionReadModel
};
