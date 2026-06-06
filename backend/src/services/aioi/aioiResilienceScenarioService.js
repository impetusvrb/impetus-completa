'use strict';

/**
 * AIOI-P2.7 — Resilience Improvement Scenario Service (READ ONLY)
 *
 * Estima impacto teórico na resiliência — sem alterar score real.
 */

const { isValidUUID } = require('../../utils/security');
const scenMetrics = require('./aioiScenarioMetrics');
const resMetrics = require('./aioiResilienceMetrics');
const resilienceService = require('./aioiOperationalResilienceService');

function _buildImproved(score, factor) {
  const resilience_score = scenMetrics.applyImprovement(score, factor);
  return {
    resilience_score,
    resilience_status: resMetrics.classifyResilienceStatus(resilience_score)
  };
}

function buildResilienceImprovementScenario(currentResilience) {
  const score = currentResilience?.resilience_score ?? 0;
  const status = currentResilience?.resilience_status ?? 'fragile';

  return {
    current_resilience: { resilience_score: score, resilience_status: status },
    improved_10pct: _buildImproved(score, scenMetrics.IMPROVEMENT_FACTORS.pct10),
    improved_25pct: _buildImproved(score, scenMetrics.IMPROVEMENT_FACTORS.pct25),
    improved_50pct: _buildImproved(score, scenMetrics.IMPROVEMENT_FACTORS.pct50)
  };
}

async function getResilienceImprovementScenario(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const resilienceRes = await resilienceService.getOperationalResilience(companyId);
    if (!resilienceRes.ok) {
      scenMetrics.recordError(companyId, 'getResilienceImprovementScenario', resilienceRes.error);
      return { ok: false, error: resilienceRes.error };
    }

    const resilience_improvement_scenario = buildResilienceImprovementScenario(
      resilienceRes.operational_resilience
    );

    scenMetrics.recordResilienceScenarioAnalyzed(companyId);
    return { ok: true, resilience_improvement_scenario };

  } catch (err) {
    scenMetrics.recordError(companyId, 'getResilienceImprovementScenario', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildResilienceImprovementScenario,
  getResilienceImprovementScenario
};
