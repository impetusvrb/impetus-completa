'use strict';

const THRESHOLDS = Object.freeze({
  min_module_count: 2,
  min_readiness_score: 0.75,
  max_leakage_probability: 0.35,
  min_density_score: 0.45
});

function evaluateContextualSafetyThresholds(metrics = {}) {
  const safe =
    (metrics.module_count ?? 10) >= THRESHOLDS.min_module_count &&
    (metrics.readiness_score ?? 1) >= THRESHOLDS.min_readiness_score &&
    (metrics.leakage_probability ?? 0) <= THRESHOLDS.max_leakage_probability;

  return { safe, thresholds: THRESHOLDS, metrics };
}

module.exports = { evaluateContextualSafetyThresholds, THRESHOLDS };
