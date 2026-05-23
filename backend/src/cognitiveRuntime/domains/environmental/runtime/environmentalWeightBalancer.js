'use strict';

const flags = require('../../../config/phaseP1EnvironmentalFeatureFlags');

function balanceEnvironmentalCenters(centers = [], profileCode = '') {
  const w = flags.getProfileWeights(profileCode);
  const total = centers.reduce((s, c) => s + (c.weight || 0), 0) || 1;
  return centers.map((c) => {
    const mult = c.layer === 'governance' ? w.governance : c.layer === 'strategic' ? w.strategic : w.operational;
    return { ...c, weight: Math.round(((c.weight || 0) / total) * mult * 1000) / 1000 };
  });
}

module.exports = { balanceEnvironmentalCenters };
