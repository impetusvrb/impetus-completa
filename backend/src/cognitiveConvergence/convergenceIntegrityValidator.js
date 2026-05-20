'use strict';

function validateConvergenceIntegrity(report = {}) {
  const fragmentation = report.cognitive_fragmentation_rate ?? 0;
  const convergence = report.convergence_rate ?? 0.85;
  const valid = fragmentation < 0.35 && convergence >= 0.7;

  return {
    valid,
    convergence_confidence: Number(((convergence + (1 - fragmentation)) / 2).toFixed(4)),
    runtime_truth_integrity: report.truth_integrity ?? 0.88,
    semantic_convergence_rate: report.semantic_convergence_health ?? convergence
  };
}

module.exports = { validateConvergenceIntegrity };
