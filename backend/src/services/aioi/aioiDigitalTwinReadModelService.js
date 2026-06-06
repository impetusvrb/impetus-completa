'use strict';

/**
 * AIOI-P2.8 — Digital Twin Read Model Service (READ ONLY)
 *
 * Agregador da camada digital twin + read models P2.1–P2.7.
 */

const { isValidUUID } = require('../../utils/security');
const twinMetrics = require('./aioiDigitalTwinMetrics');
const scenarioReadModel = require('./aioiScenarioReadModelService');
const operationalStateService = require('./aioiOperationalStateService');
const futureStateService = require('./aioiFutureStateService');
const scenarioStateService = require('./aioiScenarioStateService');
const twinConsistencyService = require('./aioiTwinConsistencyService');

async function getDigitalTwinReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  twinMetrics.recordDigitalTwinRequested(companyId);
  const startMs = Date.now();

  try {
    const [
      scenarioRes,
      operationalRes,
      futureRes,
      scenarioStateRes,
      consistencyRes
    ] = await Promise.all([
      scenarioReadModel.getScenarioReadModel(companyId),
      operationalStateService.getOperationalState(companyId),
      futureStateService.getFutureState(companyId),
      scenarioStateService.getScenarioState(companyId),
      twinConsistencyService.getTwinConsistency(companyId)
    ]);

    const failures = [scenarioRes, operationalRes, futureRes, scenarioStateRes, consistencyRes]
      .filter(r => !r.ok);
    if (failures.length) {
      twinMetrics.recordError(companyId, 'getDigitalTwinReadModel', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const srm = scenarioRes.scenario_read_model;
    twinMetrics.recordDigitalTwinCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      digital_twin_read_model: {
        governance_read_model:   srm.governance_read_model,
        predictive_read_model:   srm.predictive_read_model,
        maturity_read_model:     srm.maturity_read_model,
        strategic_read_model:    srm.strategic_read_model,
        value_read_model:        srm.value_read_model,
        resilience_read_model:   srm.resilience_read_model,
        scenario_read_model: {
          backlog_reduction_scenario:      srm.backlog_reduction_scenario,
          sla_recovery_scenario:           srm.sla_recovery_scenario,
          capacity_expansion_scenario:     srm.capacity_expansion_scenario,
          resilience_improvement_scenario: srm.resilience_improvement_scenario
        },
        operational_state:       operationalRes.operational_state,
        future_state:            futureRes.future_state,
        scenario_state:          scenarioStateRes.scenario_state,
        twin_consistency:        consistencyRes.twin_consistency
      }
    };

  } catch (err) {
    twinMetrics.recordError(companyId, 'getDigitalTwinReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getDigitalTwinReadModel
};
