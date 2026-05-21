'use strict';

const { buildKpiRuntimeEvolutionTimeline } = require('./kpiRuntimeEvolutionTimeline');
const { buildKpiConvergenceTimeline } = require('./kpiConvergenceTimeline');
const { buildKpiGovernanceEvolution } = require('./kpiGovernanceEvolution');
const { recordKpiStabilityHistory } = require('./kpiStabilityHistory');

function buildKpiObservabilityEvolution(tenantId, pack = {}) {
  return {
    runtime_timeline: buildKpiRuntimeEvolutionTimeline(tenantId, pack),
    convergence_timeline: buildKpiConvergenceTimeline(pack.convergence),
    governance_evolution: buildKpiGovernanceEvolution(pack.health),
    stability_history: recordKpiStabilityHistory(pack.stability)
  };
}

module.exports = { buildKpiObservabilityEvolution };
