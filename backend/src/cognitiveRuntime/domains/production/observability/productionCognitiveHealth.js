'use strict';

function computeProductionCognitiveHealth(metrics = {}) {
  const score = Math.round(
    (metrics.specialized_ratio || 0.7) * 40 +
      (metrics.operational_focus || 0.8) * 30 +
      (metrics.usefulness || 0.75) * 20 +
      (metrics.telemetry_ready ? 10 : 0)
  );
  return {
    production_cognitive_health: {
      score: Math.min(100, score),
      maturity: score >= 75 ? 'production_native' : 'transition',
      telemetry_integrity: metrics.telemetry_readiness || 'unknown',
      overload: metrics.overload_detected === true
    }
  };
}

module.exports = { computeProductionCognitiveHealth };
