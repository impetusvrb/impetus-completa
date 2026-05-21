'use strict';

function simulateLowDensityDeliveryReduction(ctx = {}) {
  const density = ctx.operational_density?.runtime_density_score ?? ctx.density_score ?? 0.8;
  const reduce = density < 0.55;

  return {
    low_density: reduce,
    density_score: density,
    widgets_would_reduce: reduce ? Math.ceil((ctx.widgets?.length || 8) * 0.3) : 0,
    applied: false,
    simulation_only: true
  };
}

module.exports = { simulateLowDensityDeliveryReduction };
