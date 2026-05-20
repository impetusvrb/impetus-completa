'use strict';

function assessRuntimeActivationHealth(metrics = {}) {
  const rollout_health = Number(
    ((metrics.contextual_delivery_accuracy ?? 0.85) +
      (metrics.hierarchy_accuracy ?? 0.9) +
      (metrics.activation_stability ?? 0.88)) /
      3
  ).toFixed(4);
  const status = parseFloat(rollout_health) >= 0.8 ? 'healthy' : parseFloat(rollout_health) >= 0.65 ? 'degraded' : 'critical';
  return {
    rollout_health: parseFloat(rollout_health),
    status,
    runtime_activation_confidence: metrics.runtime_activation_confidence ?? 0.85
  };
}

module.exports = { assessRuntimeActivationHealth };
