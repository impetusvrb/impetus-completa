'use strict';

function analyzeCompliancePressure(signalBundle = {}, compliance = {}) {
  const pressure = (compliance.licenses_expiring ?? 0) * 0.2 + (compliance.compliance_risk_score ?? 0) / 100;
  return { compliance_pressure: Math.round(pressure * 100) / 100, saturation: pressure > 1.2 };
}

module.exports = { analyzeCompliancePressure };
