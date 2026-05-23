'use strict';

function computeAdaptiveSignalWeighting(payload = {}, usefulness = {}) {
  const domains = usefulness.domains || {};
  const total = Object.values(domains).reduce((s, v) => s + (v || 0), 0) || 1;
  const weights = {};
  for (const [d, v] of Object.entries(domains)) {
    if (v != null) weights[d] = Math.round((v / total) * 100) / 100;
  }
  return { adaptive_weights: weights, mutation_applied: false };
}

module.exports = { computeAdaptiveSignalWeighting };
