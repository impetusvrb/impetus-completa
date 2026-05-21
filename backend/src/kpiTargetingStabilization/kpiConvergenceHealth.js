'use strict';

function assessKpiConvergenceHealth(parts = {}) {
  const scores = [
    parts.hierarchy?.consistent ? 1 : 0.4,
    parts.functional?.consistent ? 1 : 0.5,
    parts.stability?.stable ? 1 : 0.45,
    parts.tenant?.pilot_tenant ? 1 : 0
  ];
  const health = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { convergence_health: Number(health.toFixed(4)), converged: health >= 0.72 };
}

module.exports = { assessKpiConvergenceHealth };
