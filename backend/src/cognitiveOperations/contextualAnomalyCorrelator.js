'use strict';

const { correlateRuntimeAnomalies } = require('./runtimeAnomalyCorrelation');

function correlateContextualAnomalies(ctx = {}) {
  return correlateRuntimeAnomalies({
    drift_detected: ctx.drift?.drift_detected,
    fallback_rate: ctx.fallback_rate ?? 0,
    entropy: ctx.entropy?.runtime_entropy_score ?? 0,
    leakage_count: ctx.leakage_count ?? 0,
    divergence_count: ctx.divergence_count ?? 0
  });
}

module.exports = { correlateContextualAnomalies };
