'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isKpiRuntimeEnforcementEnabled: () => _flag('IMPETUS_KPI_RUNTIME_ENFORCEMENT', false),
  isTenantKpiEnforcementEnabled: () => _flag('IMPETUS_TENANT_KPI_ENFORCEMENT', false),
  isKpiSafetyValidationEnabled: () => _flag('IMPETUS_KPI_SAFETY_VALIDATION', false),
  isKpiTargetingStabilizationEnabled: () => _flag('IMPETUS_KPI_TARGETING_STABILIZATION', false),
  isKpiPilotObservabilityEnabled: () => _flag('IMPETUS_KPI_PILOT_OBSERVABILITY', true)
};
