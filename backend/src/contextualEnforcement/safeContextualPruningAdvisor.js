'use strict';

const { isModuleAllowedForContext } = require('./moduleDeliveryClassification');

function adviseSafeContextualPruning(matrix = {}, ctx = {}) {
  const would_hide = matrix.would_block_simulation || [];
  const recommendations = would_hide.map((w) => ({
    module: w.module,
    action: 'would_hide_in_Z2',
    reason: w.reason,
    applied: false
  }));

  return {
    pruning_recommendations: recommendations,
    modules_that_would_hide: would_hide.map((w) => w.module),
    auto_remove: false,
    simulation_only: true
  };
}

module.exports = { adviseSafeContextualPruning };
