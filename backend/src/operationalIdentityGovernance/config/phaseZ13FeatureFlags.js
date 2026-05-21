'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

module.exports = {
  isOperationalIdentityGovernanceEnabled: () =>
    _flag('IMPETUS_OPERATIONAL_IDENTITY_GOVERNANCE', true) ||
    _flag('IMPETUS_CONTEXTUAL_ENFORCEMENT_ACTIVATION', false),
  isRealEnforcementActivationEnabled: () => _flag('IMPETUS_CONTEXTUAL_ENFORCEMENT_ACTIVATION', false),
  isRealMenuGovernanceEnabled: () =>
    _flag('IMPETUS_SAFE_MENU_ENFORCEMENT', false) && _flag('IMPETUS_TENANT_CONTEXTUAL_ENFORCEMENT', false),
  isRealKpiTargetingEnabled: () => _flag('IMPETUS_KPI_RUNTIME_ENFORCEMENT', false),
  isRealSummaryTargetingEnabled: () => _flag('IMPETUS_SUMMARY_RUNTIME_OBSERVABILITY', false),
  isOperationalLeakageObservabilityEnabled: () =>
    _flag('IMPETUS_RUNTIME_OBSERVATION', true) || _flag('IMPETUS_RUNTIME_OBSERVATION_OBSERVABILITY', true),
  chatEnforcement: false,
  boundaryGovernance: false,
  autoRemediation: false,
  globalAutoPruning: false
};
