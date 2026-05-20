'use strict';

function assessGovernanceComplexity(layers = {}) {
  const active = Object.entries(layers).filter(([, v]) => v).map(([k]) => k);
  const count = active.length;
  const complexity_score = Number(Math.min(1, count * 0.14).toFixed(4));
  return {
    active_layers: active,
    layer_count: count,
    complexity_score,
    reduction_recommended: count > 4
  };
}

module.exports = { assessGovernanceComplexity };
