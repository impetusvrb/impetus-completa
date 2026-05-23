'use strict';

function validateEnvironmentalRiskGovernance(signalBundle = {}) {
  const op = signalBundle.operational || {};
  const score = op.compliance_risk_score ?? 0;
  return {
    risk_score: score,
    regulatory_risk: score >= 50,
    esg_risk: op.esg_score != null && op.esg_score < 60,
    audit_critical: (op.audit_open ?? 0) > 2
  };
}

module.exports = { validateEnvironmentalRiskGovernance };
