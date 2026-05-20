'use strict';

const phaseM = require('./config/phaseMFeatureFlags');
const { buildUnifiedCognitiveContext } = require('./unifiedCognitiveContextEngine');

function orchestrateAiRequest(user, channel, ctx = {}) {
  const unified = buildUnifiedCognitiveContext(user, { ...ctx, channel });
  const enforcement = phaseM.isGovernedAiOrchestrationEnabled();

  return {
    channel,
    authority_state: unified.runtime_truth_state?.authority,
    shared_context: unified.runtime_truth_state,
    enforcement_active: enforcement,
    shadow_only: !enforcement,
    concurrent_inference_blocked: enforcement,
    legacy_parallel_allowed: !enforcement
  };
}

module.exports = { orchestrateAiRequest };
