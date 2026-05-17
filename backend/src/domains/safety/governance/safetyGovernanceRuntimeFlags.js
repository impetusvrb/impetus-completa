'use strict';

function truthy(v) {
  return String(v || '').toLowerCase() === 'true' || v === '1';
}

function isSafetyGovernanceRuntimeEnabled() {
  return truthy(process.env.IMPETUS_SAFETY_GOVERNANCE_RUNTIME_ENABLED);
}

function isSafetyRiskMatrixEnabled() {
  return truthy(process.env.IMPETUS_SAFETY_RISK_MATRIX_ENABLED);
}

function isSafetyGheRuntimeEnabled() {
  return truthy(process.env.IMPETUS_SAFETY_GHE_RUNTIME_ENABLED);
}

function isSafetyComplianceRuntimeEnabled() {
  return truthy(process.env.IMPETUS_SAFETY_COMPLIANCE_RUNTIME_ENABLED);
}

function getGovernanceRuntimeFlagSnapshot() {
  return {
    governance: isSafetyGovernanceRuntimeEnabled(),
    risk_matrix: isSafetyRiskMatrixEnabled(),
    ghe: isSafetyGheRuntimeEnabled(),
    compliance: isSafetyComplianceRuntimeEnabled()
  };
}

module.exports = {
  isSafetyGovernanceRuntimeEnabled,
  isSafetyRiskMatrixEnabled,
  isSafetyGheRuntimeEnabled,
  isSafetyComplianceRuntimeEnabled,
  getGovernanceRuntimeFlagSnapshot
};
