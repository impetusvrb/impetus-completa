'use strict';

const flagsZ23 = require('../../config/phaseZ23FeatureFlags');

function balanceCentersByDomain(centers = [], profileCode = 'coordinator_quality') {
  const weights = flagsZ23.domainWeights();
  const layerMap = { operational: weights.operational, governance: weights.governance, strategic: weights.strategic };

  return centers
    .map((c) => ({
      ...c,
      domain_weight: layerMap[c.layer] ?? weights.operational,
      balanced_score: (c.weight || 0.1) * (layerMap[c.layer] ?? 0.7)
    }))
    .sort((a, b) => b.balanced_score - a.balanced_score);
}

function computeOperationalFocus(centers = []) {
  const op = centers.filter((c) => c.layer === 'operational');
  const total = centers.length || 1;
  return Math.round((op.length / total) * 1000) / 1000;
}

module.exports = { balanceCentersByDomain, computeOperationalFocus };
