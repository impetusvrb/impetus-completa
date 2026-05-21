'use strict';

function analyzeRuntimeDeliveryQuality(modules = [], ctx = {}) {
  const count = Array.isArray(modules) ? modules.length : 0;
  const genericPenalty = modules.includes('dashboard') && count <= 4 ? 0.15 : 0;
  const domainSpecific = modules.filter((m) =>
    /intelligence|emissions|manuia|anomaly/.test(m)
  ).length;
  const quality = Math.min(1, Math.max(0.2, 0.5 + domainSpecific * 0.08 + count * 0.03 - genericPenalty));

  return {
    delivery_quality_score: Number(quality.toFixed(4)),
    module_count: count,
    domain_specific_count: domainSpecific,
    generic_cockpit_risk: genericPenalty > 0
  };
}

module.exports = { analyzeRuntimeDeliveryQuality };
