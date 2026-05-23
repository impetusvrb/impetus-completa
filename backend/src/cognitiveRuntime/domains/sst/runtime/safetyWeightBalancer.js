'use strict';

const flagsZ25 = require('../../../config/phaseZ25FeatureFlags');

function getSafetyProfileWeights(profileCode = '') {
  return flagsZ25.getProfileWeights(profileCode);
}

function balanceSafetyCenters(centers = [], profileCode = '') {
  const weights = getSafetyProfileWeights(profileCode);
  const opBoost = weights.operational / 0.65;
  return centers.map((c) => {
    let w = c.weight || 0.1;
    if (c.layer === 'operational') w *= opBoost;
    if (c.layer === 'governance') w *= weights.governance / 0.25;
    if (c.layer === 'strategic') w *= weights.strategic / 0.1;
    return { ...c, weight: Math.round(w * 1000) / 1000, profile_weights: weights };
  }).sort((a, b) => b.weight - a.weight);
}

module.exports = { getSafetyProfileWeights, balanceSafetyCenters };
