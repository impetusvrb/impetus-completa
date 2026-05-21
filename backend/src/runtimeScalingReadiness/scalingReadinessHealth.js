'use strict';

function assessScalingReadinessHealth(pack = {}) {
  const safe = pack.scaling_safe === true && pack.stable === true;
  const score = safe ? 0.85 : pack.scaling_safe ? 0.6 : 0.35;
  return { health_score: score, healthy: safe, continuous_ready: score >= 0.55 };
}

module.exports = { assessScalingReadinessHealth };
