'use strict';

const flags = require('../productionRuntimeActivation/config/phaseZ12FeatureFlags');

function stabilizeProductionRuntime(pack = {}) {
  const unstable = pack.stability?.unstable || pack.scaling?.scaling_instability_detected;
  return {
    stabilized: !unstable,
    rollout_stable: !unstable,
    payload_modified: false,
    recommendation_only: !flags.isRuntimeStabilizationEnabled()
  };
}

module.exports = { stabilizeProductionRuntime };
