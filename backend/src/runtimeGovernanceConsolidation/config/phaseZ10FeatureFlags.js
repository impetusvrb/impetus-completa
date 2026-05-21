'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isTenantGovernanceMaturityEnabled: () => _flag('IMPETUS_TENANT_GOVERNANCE_MATURITY', false),
  isRuntimeSustainabilityEnabled: () => _flag('IMPETUS_RUNTIME_SUSTAINABILITY', false),
  isGovernancePressureAnalysisEnabled: () => _flag('IMPETUS_GOVERNANCE_PRESSURE_ANALYSIS', false),
  isExpansionReadinessValidationEnabled: () => _flag('IMPETUS_EXPANSION_READINESS_VALIDATION', false),
  isRuntimeConsolidationObservabilityEnabled: () => _flag('IMPETUS_RUNTIME_CONSOLIDATION_OBSERVABILITY', true)
};
