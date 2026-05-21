'use strict';

function assessRolloutScalingReadiness(validator = {}, health = {}) {
  return {
    rollout_stable: validator.scaling_safe === true,
    rollout_scaling_ready: health.continuous_ready === true && validator.scaling_safe,
    recommendation_only: true
  };
}

module.exports = { assessRolloutScalingReadiness };
