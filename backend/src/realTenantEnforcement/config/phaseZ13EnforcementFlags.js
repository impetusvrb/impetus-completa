'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

module.exports = {
  isRealTenantEnforcementEnabled: () =>
    _flag('IMPETUS_CONTEXTUAL_ENFORCEMENT_ACTIVATION', false) &&
    _flag('IMPETUS_PILOT_TENANT_ENFORCEMENT', false),
  isMenuRuntimeStabilizationEnabled: () => _flag('IMPETUS_MENU_RUNTIME_STABILIZATION', false),
  isTenantContextualEnforcementEnabled: () => _flag('IMPETUS_TENANT_CONTEXTUAL_ENFORCEMENT', false),
  isSafeMenuEnforcementEnabled: () => _flag('IMPETUS_SAFE_MENU_ENFORCEMENT', false),
  isKpiRuntimeEnforcementEnabled: () => _flag('IMPETUS_KPI_RUNTIME_ENFORCEMENT', false),
  isSummaryRuntimeObservabilityEnabled: () => _flag('IMPETUS_SUMMARY_RUNTIME_OBSERVABILITY', false),
  chatEnforcement: false,
  boundaryGovernance: false,
  autoRemediation: false,
  globalAutoPruning: false
};
