'use strict';

/**
 * AIOI-P2.7 — Executive Scenario Read Model Service (READ ONLY)
 *
 * Agregador da camada de cenários + read models P2.1–P2.6.
 */

const { isValidUUID } = require('../../utils/security');
const scenMetrics = require('./aioiScenarioMetrics');
const resilienceReadModel = require('./aioiResilienceReadModelService');
const backlogScenario = require('./aioiBacklogReductionScenarioService');
const slaScenario = require('./aioiSlaRecoveryScenarioService');
const capacityScenario = require('./aioiCapacityExpansionScenarioService');
const resilienceScenario = require('./aioiResilienceScenarioService');

async function getScenarioReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  scenMetrics.recordScenarioRequested(companyId);
  const startMs = Date.now();

  try {
    const [
      resilienceRes,
      backlogRes,
      slaRes,
      capacityRes,
      resilienceImprovementRes
    ] = await Promise.all([
      resilienceReadModel.getResilienceReadModel(companyId),
      backlogScenario.getBacklogReductionScenario(companyId),
      slaScenario.getSlaRecoveryScenario(companyId),
      capacityScenario.getCapacityExpansionScenario(companyId),
      resilienceScenario.getResilienceImprovementScenario(companyId)
    ]);

    const failures = [resilienceRes, backlogRes, slaRes, capacityRes, resilienceImprovementRes]
      .filter(r => !r.ok);
    if (failures.length) {
      scenMetrics.recordError(companyId, 'getScenarioReadModel', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const rrm = resilienceRes.resilience_read_model;
    scenMetrics.recordScenarioCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      scenario_read_model: {
        governance_read_model:              rrm.governance_read_model,
        predictive_read_model:              rrm.predictive_read_model,
        maturity_read_model:                rrm.maturity_read_model,
        strategic_read_model:               rrm.strategic_read_model,
        value_read_model:                   rrm.value_read_model,
        resilience_read_model: {
          operational_resilience:         rrm.operational_resilience,
          dependency_risk:                  rrm.dependency_risk,
          recovery_readiness:               rrm.recovery_readiness,
          sustainability:                   rrm.sustainability
        },
        backlog_reduction_scenario:         backlogRes.backlog_reduction_scenario,
        sla_recovery_scenario:              slaRes.sla_recovery_scenario,
        capacity_expansion_scenario:        capacityRes.capacity_expansion_scenario,
        resilience_improvement_scenario:    resilienceImprovementRes.resilience_improvement_scenario
      }
    };

  } catch (err) {
    scenMetrics.recordError(companyId, 'getScenarioReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getScenarioReadModel
};
