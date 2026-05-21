'use strict';

const flags = require('./config/phaseZ1FeatureFlags');
const { logPhaseZ1 } = require('./phaseZ1Logger');

function simulateShadowModulePruning(matrix = {}, ctx = {}) {
  if (!flags.isContextualPruningSimulationEnabled() && !ctx.force_simulation) {
    return { simulation_enabled: false, simulated: false, auto_remove: false };
  }

  const delivered = ctx.visible_modules || [];
  const would_remain = matrix.permitted_modules_simulation || [];
  const would_hide = (matrix.would_block_simulation || []).map((w) => w.module);

  if (would_hide.length && flags.isContextualEnforcementObservabilityEnabled()) {
    logPhaseZ1('PRUNING_SIMULATION_RUN', {
      hide_count: would_hide.length,
      remain_count: would_remain.length,
      shadow_only: true
    });
  }

  return {
    simulation_enabled: true,
    simulated: true,
    before: delivered,
    after_simulation: would_remain,
    would_hide,
    modules_removed_count: would_hide.length,
    applied: false,
    auto_remove: false
  };
}

module.exports = { simulateShadowModulePruning };
