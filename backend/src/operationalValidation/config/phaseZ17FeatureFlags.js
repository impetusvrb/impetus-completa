'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

module.exports = {
  isOperationalValidationEnabled: () => _flag('IMPETUS_OPERATIONAL_VALIDATION', false),
  isPilotReactivationEnabled: () => _flag('IMPETUS_PILOT_REACTIVATION', false),
  isRefreshDeterminismValidationEnabled: () => _flag('IMPETUS_REFRESH_DETERMINISM_VALIDATION', false),
  isDomainIsolationValidationEnabled: () => _flag('IMPETUS_DOMAIN_ISOLATION_VALIDATION', false),
  isRuntimeFreezeValidationEnabled: () => _flag('IMPETUS_RUNTIME_FREEZE_VALIDATION', false),
  isOperationalValidationObservabilityEnabled: () =>
    _flag('IMPETUS_OPERATIONAL_VALIDATION_OBSERVABILITY', true),
  autoRemediation: false,
  globalAutoPruning: false,
  chatEnforcement: false,
  boundaryEnforcement: false
};
