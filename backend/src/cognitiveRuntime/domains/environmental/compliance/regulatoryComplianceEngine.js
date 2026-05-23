'use strict';

const compliance = require('../../../../domains/environment/governance/compliance/environmentComplianceRuntime');

function evaluateRegulatoryCompliance(signalBundle = {}) {
  const input = {
    licenses: signalBundle.raw?.licenses || [],
    obligations: [],
    audits: [],
    findings: []
  };
  const out = compliance.environmentComplianceRuntime(input);
  return {
    compliant: (out.alerts?.alert_count ?? 0) === 0,
    licensing: out.licensing,
    alerts: out.alerts,
    audit: out.audit,
    legal_risk: (out.alerts?.alert_count ?? 0) > 0
  };
}

module.exports = { evaluateRegulatoryCompliance };
