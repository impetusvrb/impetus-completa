'use strict';

function reduceComplianceNoise(centers = []) {
  const gov = centers.filter((c) => c.layer === 'governance');
  const noise = gov.length > 4;
  return { compliance_noise: noise, governance_centers: gov.length, reduced: noise ? gov.slice(0, 4) : gov };
}

module.exports = { reduceComplianceNoise };
