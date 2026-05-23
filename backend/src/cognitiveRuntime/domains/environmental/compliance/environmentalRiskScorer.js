'use strict';

function scoreEnvironmentalRisk(signalBundle = {}) {
  const op = signalBundle.operational || {};
  const score = Math.min(
    100,
    (op.compliance_risk_score ?? 0) +
      (op.regulatory_alerts ?? 0) * 8 +
      (op.licenses_expiring ?? 0) * 12 +
      (op.incidents_open ?? 0) * 10
  );
  return {
    environmental_risk_score: score,
    level: score >= 70 ? 'high' : score >= 40 ? 'medium' : 'low',
    regulatory_risk: score >= 50
  };
}

module.exports = { scoreEnvironmentalRisk };
