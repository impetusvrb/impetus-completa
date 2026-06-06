'use strict';

/**
 * AIOI-P2.8 — Scenario State Service (READ ONLY)
 *
 * Cenários hipotéticos — reutiliza P2.7, sem reimplementação.
 */

const { isValidUUID } = require('../../utils/security');
const twinMetrics = require('./aioiDigitalTwinMetrics');
const backlogScenario = require('./aioiBacklogReductionScenarioService');
const slaScenario = require('./aioiSlaRecoveryScenarioService');
const capacityScenario = require('./aioiCapacityExpansionScenarioService');
const resilienceScenario = require('./aioiResilienceScenarioService');

function buildScenarioState({
  backlogReduction,
  slaRecovery,
  capacityExpansion,
  resilienceImprovement
}) {
  return {
    backlog_scenarios:    backlogReduction,
    sla_scenarios:        slaRecovery,
    capacity_scenarios:   capacityExpansion,
    resilience_scenarios: resilienceImprovement
  };
}

async function getScenarioState(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [backlogRes, slaRes, capacityRes, resilienceRes] = await Promise.all([
      backlogScenario.getBacklogReductionScenario(companyId),
      slaScenario.getSlaRecoveryScenario(companyId),
      capacityScenario.getCapacityExpansionScenario(companyId),
      resilienceScenario.getResilienceImprovementScenario(companyId)
    ]);

    const failures = [backlogRes, slaRes, capacityRes, resilienceRes].filter(r => !r.ok);
    if (failures.length) {
      twinMetrics.recordError(companyId, 'getScenarioState', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const scenario_state = buildScenarioState({
      backlogReduction:      backlogRes.backlog_reduction_scenario,
      slaRecovery:           slaRes.sla_recovery_scenario,
      capacityExpansion:     capacityRes.capacity_expansion_scenario,
      resilienceImprovement: resilienceRes.resilience_improvement_scenario
    });

    twinMetrics.recordScenarioStateAnalyzed(companyId);
    return { ok: true, scenario_state };

  } catch (err) {
    twinMetrics.recordError(companyId, 'getScenarioState', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildScenarioState,
  getScenarioState
};
