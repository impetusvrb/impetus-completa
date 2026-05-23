'use strict';

function computeEnvironmentalCognitiveHealth(metrics = {}) {
  const score = Math.min(
    100,
    Math.round(
      (metrics.specialized_ratio || 0.7) * 35 +
        (metrics.compliance_focus || 0.8) * 30 +
        (metrics.usefulness || 0.75) * 20 +
        (metrics.telemetry_ready ? 15 : 0)
    )
  );
  return {
    environmental_cognitive_health: {
      score,
      maturity: score >= 75 ? 'environmental_native' : 'transition',
      regulatory_integrity: metrics.regulatory_ok !== false
    }
  };
}

module.exports = { computeEnvironmentalCognitiveHealth };
