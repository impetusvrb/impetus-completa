'use strict';

const { buildSummaryRuntimeEvolutionTimeline } = require('./summaryRuntimeEvolutionTimeline');
const { buildNarrativeConvergenceTimeline } = require('./narrativeConvergenceTimeline');
const { buildSummaryGovernanceEvolution } = require('./summaryGovernanceEvolution');
const { recordNarrativeStabilityHistory } = require('./narrativeStabilityHistory');

function buildSummaryObservabilityEvolution(tenantId, pack = {}) {
  return {
    runtime_timeline: buildSummaryRuntimeEvolutionTimeline(tenantId, pack),
    narrative_convergence_timeline: buildNarrativeConvergenceTimeline(pack.convergence),
    governance_evolution: buildSummaryGovernanceEvolution(pack.health),
    narrative_stability_history: recordNarrativeStabilityHistory(pack.stability)
  };
}

module.exports = { buildSummaryObservabilityEvolution };
