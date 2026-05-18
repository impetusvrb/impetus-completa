'use strict';

const { narrative } = require('./shared/correlationHelpers');

function ecosystemExecutiveCorrelationRuntime(pack = {}) {
  const pairs = pack.domain_pairs || {};
  const scores = Object.values(pairs)
    .map((p) => p.aggregate_score)
    .filter((s) => typeof s === 'number');
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  const narratives = [];
  for (const [key, val] of Object.entries(pairs)) {
    if (val.narratives) narratives.push(...val.narratives);
    else if (val.aggregate_score != null) narratives.push(narrative(key, val.aggregate_score));
  }

  return {
    ok: true,
    executive_density_score: Math.min(1, narratives.length / 8),
    ecosystem_readiness: avg >= 0.5 ? 'contextual_ready' : 'stabilizing',
    heatmap: {
      quality: pairs.quality?.aggregate_score ?? 0,
      safety: pairs.safety?.aggregate_score ?? 0,
      logistics: pairs.logistics?.aggregate_score ?? 0,
      production: pairs.production?.aggregate_score ?? 0,
      maintenance: pairs.maintenance?.aggregate_score ?? 0
    },
    risk_map: {
      elevated: scores.filter((s) => s >= 0.75).length,
      moderate: scores.filter((s) => s >= 0.45 && s < 0.75).length,
      low: scores.filter((s) => s < 0.45).length
    },
    narratives: narratives.slice(0, 12),
    explainability: { assistive_only: true, auto_action: false },
    assistive_only: true
  };
}

module.exports = { ecosystemExecutiveCorrelationRuntime };
