'use strict';

const phaseR = require('./config/phaseRFeatureFlags');
const { logPhaseR } = require('./phaseRLogger');
const { resolveDecisionReliability } = require('./runtimeDecisionReliabilityResolver');

function assessDecisionReliability(signals = {}) {
  const result = resolveDecisionReliability(signals);
  const observe = phaseR.isDecisionReliabilityObservabilityEnabled();

  if (observe && result.trust.low_trust) {
    logPhaseR('LOW_DECISION_TRUST_DETECTED', {
      score: result.trust.operational_trust_score,
      shadow_only: !phaseR.isDecisionReliabilityEnabled()
    });
  }
  if (observe && signals.weak_guidance) {
    logPhaseR('WEAK_OPERATIONAL_GUIDANCE_DETECTED', { shadow_only: true });
  }
  if (observe && signals.ambiguous) {
    logPhaseR('CONTEXTUAL_UNCERTAINTY_DETECTED', { shadow_only: true });
  }

  return {
    ...result,
    enforcement_active: phaseR.isDecisionReliabilityEnabled(),
    shadow_only: !phaseR.isDecisionReliabilityEnabled(),
    auto_remediate: false
  };
}

module.exports = { assessDecisionReliability };
