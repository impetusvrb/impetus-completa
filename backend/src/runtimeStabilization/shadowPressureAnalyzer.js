'use strict';

function analyzeShadowPressure(ctx = {}) {
  const count = ctx.shadow_block_count ?? 0;
  return {
    shadow_pressure: Number(Math.min(1, count * 0.2).toFixed(4)),
    overlap_shadow_runtime: count >= 4
  };
}

module.exports = { analyzeShadowPressure };
