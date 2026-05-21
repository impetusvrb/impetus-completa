'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isTenantExpansionScalingEnabled: () => _flag('IMPETUS_TENANT_EXPANSION_SCALING', false),
  isRuntimeScalingReadinessEnabled: () => _flag('IMPETUS_RUNTIME_SCALING_READINESS', false),
  isGovernanceLoadProtectionEnabled: () => _flag('IMPETUS_GOVERNANCE_LOAD_PROTECTION', false),
  isRuntimeExpansionControlEnabled: () => _flag('IMPETUS_RUNTIME_EXPANSION_CONTROL', false),
  isRuntimeExpansionObservabilityEnabled: () => _flag('IMPETUS_RUNTIME_EXPANSION_OBSERVABILITY', true)
};
