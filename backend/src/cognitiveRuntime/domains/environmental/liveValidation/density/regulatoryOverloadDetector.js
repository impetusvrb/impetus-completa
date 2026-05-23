'use strict';

function detectRegulatoryOverload(consolidated = {}) {
  const centers = consolidated.centers?.length ?? 0;
  const govCenters = (consolidated.centers || []).filter((c) => c.layer === 'governance').length;
  return {
    overload_detected: centers > 6 || govCenters > 4,
    governance_noise: govCenters > 4,
    compliance_noise: govCenters > 5
  };
}

module.exports = { detectRegulatoryOverload };
