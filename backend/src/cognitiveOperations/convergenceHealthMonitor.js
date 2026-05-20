'use strict';

function monitorConvergenceHealth(convergenceBlock = {}) {
  const score = convergenceBlock.convergence_confidence
    ?? convergenceBlock.cognitive_consistency_score
    ?? 0.85;
  return {
    convergence_health: Number(Number(score).toFixed(4)),
    runtime_truth_integrity: convergenceBlock.runtime_truth_integrity ?? 0.88,
    degraded: score < 0.7
  };
}

module.exports = { monitorConvergenceHealth };
