'use strict';

const phaseP = require('./config/phasePFeatureFlags');
const { stabilizeModules } = require('./runtimeModuleStabilizer');

function targetModules(modules, user, ctx = {}) {
  const stabilized = stabilizeModules(modules, user, ctx);
  const enforcement = phaseP.isGovernedModuleTargetingEnabled();
  return {
    visible_modules: enforcement ? stabilized.eligible_modules : modules,
    precise_modules: stabilized.eligible_modules,
    ...stabilized,
    enforcement_active: enforcement,
    shadow_only: !enforcement,
    auto_filtered: false
  };
}

module.exports = { targetModules };
