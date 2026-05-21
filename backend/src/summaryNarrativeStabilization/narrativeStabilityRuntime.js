'use strict';

const flags = require('../summaryRuntimeActivation/config/phaseZ9FeatureFlags');
const { detectNarrativeOscillation } = require('./summaryNarrativeOscillationDetector');
const { assessContextualNarrativeIntegrity } = require('./contextualNarrativeIntegrity');

function runNarrativeStabilityRuntime(summaryPayload = {}, ctx = {}) {
  const oscillation = detectNarrativeOscillation(summaryPayload, ctx);
  const integrity = assessContextualNarrativeIntegrity(summaryPayload, ctx);
  const unstable = oscillation.oscillating || integrity.unstable;

  return {
    phase: 'Z.9',
    stabilization_enabled: flags.isSummaryNarrativeStabilizationEnabled(),
    oscillation,
    integrity,
    unstable,
    payload_unchanged: true,
    recommendation_only: !flags.isSummaryNarrativeStabilizationEnabled()
  };
}

module.exports = { runNarrativeStabilityRuntime };
