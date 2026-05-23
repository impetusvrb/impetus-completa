'use strict';

function validateEnvironmentalCompliance(signalBundle = {}) {
  const op = signalBundle.operational || {};
  const licenses = signalBundle.raw?.licenses || [];
  const expired = licenses.filter((l) => l.days_to_expire != null && l.days_to_expire < 0);
  const expiring = licenses.filter((l) => l.days_to_expire != null && l.days_to_expire >= 0 && l.days_to_expire <= 90);
  return {
    compliant: expired.length === 0 && (op.regulatory_alerts ?? 0) === 0,
    licenses_total: op.licenses_total ?? licenses.length,
    licenses_expiring: op.licenses_expiring ?? expiring.length,
    licenses_expired: expired.length,
    compliance_drift: expired.length > 0,
    legal_risk: expired.length > 0 || (op.compliance_risk_score ?? 0) >= 70,
    lost_obligation: false
  };
}

module.exports = { validateEnvironmentalCompliance };
