'use strict';

function assessPilotRuntimeConfidence(pack = {}) {
  const health = pack.health_score ?? 0.5;
  const safe = pack.activation_safety?.activation_safe !== false;
  return { confidence_score: safe ? health : health * 0.6, runtime_confident: health >= 0.55 && safe };
}

module.exports = { assessPilotRuntimeConfidence };
