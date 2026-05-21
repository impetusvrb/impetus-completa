'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isRuntimeObservationEnabled: () => _flag('IMPETUS_RUNTIME_OBSERVATION', false),
  isOperationalIdentityHardeningEnabled: () => _flag('IMPETUS_OPERATIONAL_IDENTITY_HARDENING', false),
  isMenuGovernanceAnalysisEnabled: () => _flag('IMPETUS_MENU_GOVERNANCE_ANALYSIS', false),
  isHierarchyAuthorityValidationEnabled: () => _flag('IMPETUS_HIERARCHY_AUTHORITY_VALIDATION', false),
  isRuntimeObservationObservabilityEnabled: () => _flag('IMPETUS_RUNTIME_OBSERVATION_OBSERVABILITY', true)
};
