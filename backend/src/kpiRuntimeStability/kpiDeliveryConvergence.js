'use strict';

function assessKpiDeliveryConvergence(pack = {}) {
  const precision = pack.targeting?.functional?.targeting_precision ?? 1;
  const leakage = pack.targeting?.cross_domain?.residual_leakage?.length ?? 0;
  const convergence = Math.max(0, Math.min(1, precision - leakage * 0.1));
  return { convergence_score: Number(convergence.toFixed(4)), converged: convergence >= 0.72 };
}

module.exports = { assessKpiDeliveryConvergence };
