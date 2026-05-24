'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

function _str(name, defaultVal = '') {
  const v = process.env[name];
  return v == null || v === '' ? defaultVal : String(v).toLowerCase();
}

module.exports = {
  isRuntimeSovereigntyEnabled: () => {
    const v = _str('IMPETUS_C6_RUNTIME_SOVEREIGNTY', 'controlled');
    return v === 'controlled' || v === 'on' || v === 'true';
  },
  engineV2RetirementMode: () => _str('IMPETUS_C6_ENGINE_V2_RETIREMENT', 'retired_shadow_reference'),
  isFallbackGovernanceEnabled: () => _flag('IMPETUS_C6_FALLBACK_GOVERNANCE', true),
  isFrontendAuthorityEnabled: () => _flag('IMPETUS_C6_FRONTEND_AUTHORITY', true),
  isGovernanceConsolidationEnabled: () => _flag('IMPETUS_C6_GOVERNANCE_CONSOLIDATION', true),
  isC6ObservabilityEnabled: () => _flag('IMPETUS_C6_OBSERVABILITY', true),
  sovereignRuntimeId: () => 'runtime_z',
  fallbackRuntimeId: () => 'motor_a',
  autoRemediation: false,
  autoDecisions: false,
  authoritativeGlobal: false,
  adaptiveMutation: false,
  motorARemoved: false,
  engineV2Removed: false
};
