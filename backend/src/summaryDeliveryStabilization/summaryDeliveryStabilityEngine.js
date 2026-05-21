'use strict';

const flags = require('../summaryConvergence/config/phaseZ8FeatureFlags');
const { detectNarrativeOscillation } = require('./narrativeOscillationDetector');
const { assessContextualNarrativeStability } = require('./contextualNarrativeStability');
const { adviseSummaryDeliveryRecovery } = require('./summaryDeliveryRecoveryAdvisor');

function runSummaryDeliveryStabilityEngine(summaryPayload = {}, ctx = {}) {
  const oscillation = detectNarrativeOscillation(summaryPayload, ctx.summary_before, ctx);
  const stability = assessContextualNarrativeStability(summaryPayload, ctx);
  const recovery = adviseSummaryDeliveryRecovery({ ...ctx, oscillation });
  return {
    stable: oscillation.stable && stability.stable,
    oscillation,
    contextual: stability,
    recovery,
    stabilization_active: flags.isSummaryRuntimeConvergenceEnabled(),
    recommendation_only: true
  };
}

module.exports = { runSummaryDeliveryStabilityEngine };
