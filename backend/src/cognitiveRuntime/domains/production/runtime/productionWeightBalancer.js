'use strict';

const flagsZP0 = require('../../../config/phaseZP0FeatureFlags');

function balanceProductionCenters(centers = [], profileCode = '') {
  const w = flagsZP0.getProfileWeights(profileCode);
  const total = centers.reduce((s, c) => s + (c.weight || 0), 0) || 1;
  return centers.map((c) => {
    const layerMult = c.layer === 'operational' ? w.operational : c.layer === 'governance' ? w.governance : w.strategic;
    return { ...c, weight: Math.round(((c.weight || 0) / total) * layerMult * 1000) / 1000 };
  });
}

module.exports = { balanceProductionCenters };
