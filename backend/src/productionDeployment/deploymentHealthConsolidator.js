'use strict';

function consolidateDeploymentHealth(validation = {}, rollback = {}, ctx = {}) {
  const maturity = ctx.operational_maturity?.composite_maturity ?? ctx.runtime_calibration?.operational_maturity?.composite_maturity ?? 0.82;
  const convergence = ctx.cognitive_convergence?.convergence_score ?? 0.84;
  const delivery = ctx.precision_delivery?.precision_score ?? ctx.contextual_delivery?.delivery_score ?? 0.83;

  const stability =
    validation.runtime_stability?.score ??
    validation.composite_score ??
    0.85;

  const health_status =
    validation.validation_passed && rollback.rollback_ready
      ? 'ready'
      : validation.validation_passed
        ? 'caution'
        : 'blocked';

  return {
    health_status,
    stability_score: Number(stability.toFixed(4)),
    convergence_score: Number(convergence.toFixed(4)),
    consistency_score: validation.runtime_consistency?.score ?? 0.88,
    delivery_precision: Number(delivery.toFixed(4)),
    runtime_maturity: Number(maturity.toFixed(4)),
    composite_operational_health: Number(
      ((stability + convergence + (validation.composite_score ?? 0.8) + maturity) / 4).toFixed(4)
    ),
    deploy_allowed: health_status === 'ready' || ctx.force === true
  };
}

module.exports = { consolidateDeploymentHealth };
