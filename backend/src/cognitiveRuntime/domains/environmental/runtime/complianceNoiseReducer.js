'use strict';

function reduceComplianceNoise(centers = []) {
  const gov = centers.filter((c) => c.layer === 'governance');
  if (gov.length <= 4) return centers;
  return [...centers].sort((a, b) => (b.weight || 0) - (a.weight || 0)).slice(0, 10);
}

module.exports = { reduceComplianceNoise };
