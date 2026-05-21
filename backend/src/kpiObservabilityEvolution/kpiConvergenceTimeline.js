'use strict';

function buildKpiConvergenceTimeline(convergence = {}) {
  return {
    convergence_score: convergence.convergence_score,
    converged: convergence.converged,
    recorded_at: new Date().toISOString()
  };
}

module.exports = { buildKpiConvergenceTimeline };
