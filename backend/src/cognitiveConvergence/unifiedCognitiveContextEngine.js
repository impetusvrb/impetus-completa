'use strict';

const phaseM = require('./config/phaseMFeatureFlags');
const { resolveRuntimeTruth } = require('./runtimeTruthResolver');
const { logPhaseM } = require('./phaseMLogger');

function buildUnifiedCognitiveContext(user, ctx = {}) {
  const resolved = resolveRuntimeTruth(user, ctx);
  const enforcement = phaseM.isUnifiedCognitiveContextEnabled();
  const observe = phaseM.isCognitiveConvergenceObservabilityEnabled() || ctx.force_observe;

  if (observe) {
    logPhaseM('UNIFIED_CONTEXT_COMPOSED', {
      axis: resolved.runtime_truth_state?.authority?.contextual_truth?.functional_axis,
      shadow_only: !enforcement
    });
  }

  return {
    unified_context: resolved.runtime_truth_state,
    runtime_truth_state: resolved.runtime_truth_state,
    enforcement_active: enforcement,
    shadow_only: !enforcement,
    consume_authority: enforcement ? 'unified' : 'legacy_parallel_allowed'
  };
}

module.exports = { buildUnifiedCognitiveContext };
