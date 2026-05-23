'use strict';

function computeOrganizationalReliability(strategic = {}) {
  const scores = [
    strategic.production_stability === 'stable' ? 1 : 0.5,
    strategic.quality_reliability === 'reliable' ? 1 : 0.5,
    strategic.safety_governance === 'controlled' ? 1 : 0.6,
    strategic.people_health === 'healthy' ? 1 : 0.55
  ];
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  return { reliability_index: Math.round(avg * 100), organizational_reliable: avg >= 0.7 };
}

module.exports = { computeOrganizationalReliability };
