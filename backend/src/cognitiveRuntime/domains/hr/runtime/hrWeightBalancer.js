'use strict';

const flagsZ26 = require('../../../config/phaseZ26FeatureFlags');

function balanceHrCenters(centers = [], profileCode = '') {
  const weights = flagsZ26.getProfileWeights(profileCode);
  const opBoost = weights.operational / 0.7;
  return centers
    .map((c) => {
      let w = c.weight || 0.1;
      if (c.layer === 'operational') w *= opBoost;
      if (c.layer === 'governance') w *= weights.governance / 0.2;
      if (c.layer === 'strategic' || c.layer === 'management') w *= (weights.governance + weights.strategic) / 0.3;
      return { ...c, weight: Math.round(w * 1000) / 1000, profile_weights: weights };
    })
    .sort((a, b) => b.weight - a.weight);
}

module.exports = { balanceHrCenters };
