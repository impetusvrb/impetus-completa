'use strict';

/**
 * AIOI-P2.7 — Capacity Expansion Scenario Service (READ ONLY)
 *
 * Simula aumento de throughput — projeção matemática sobre forecast P2.2.
 */

const { isValidUUID } = require('../../utils/security');
const scenMetrics = require('./aioiScenarioMetrics');
const capacityService = require('./aioiCapacityForecastService');

function buildCapacityExpansionScenario(currentCapacity) {
  return {
    current_capacity:  currentCapacity,
    expanded_10pct:  scenMetrics.applyExpansion(currentCapacity, scenMetrics.EXPANSION_FACTORS.pct10),
    expanded_25pct:  scenMetrics.applyExpansion(currentCapacity, scenMetrics.EXPANSION_FACTORS.pct25),
    expanded_50pct:  scenMetrics.applyExpansion(currentCapacity, scenMetrics.EXPANSION_FACTORS.pct50)
  };
}

async function getCapacityExpansionScenario(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const capacityRes = await capacityService.getOperationalCapacityForecast(companyId);
    if (!capacityRes.ok) {
      scenMetrics.recordError(companyId, 'getCapacityExpansionScenario', capacityRes.error);
      return { ok: false, error: capacityRes.error };
    }

    const currentCapacity = capacityRes.capacity_forecast.estimated_daily_throughput || 0;
    const capacity_expansion_scenario = buildCapacityExpansionScenario(currentCapacity);

    scenMetrics.recordCapacityScenarioAnalyzed(companyId);
    return { ok: true, capacity_expansion_scenario };

  } catch (err) {
    scenMetrics.recordError(companyId, 'getCapacityExpansionScenario', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildCapacityExpansionScenario,
  getCapacityExpansionScenario
};
