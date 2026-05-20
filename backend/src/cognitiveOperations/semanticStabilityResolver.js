'use strict';

function resolveSemanticStability(convergenceBlock = {}) {
  const rate = parseFloat(convergenceBlock.semantic_convergence_rate) || 0.86;
  const fragmentation = convergenceBlock.fragmentation?.cognitive_fragmentation_rate ?? 0.1;
  const semantic_stability = Number(Math.max(0, Math.min(1, rate - fragmentation * 0.5)).toFixed(4));
  return { semantic_stability, semantic_convergence_rate: rate };
}

module.exports = { resolveSemanticStability };
