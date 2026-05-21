'use strict';

function _flag(name, defaultVal = false) {
  const v = process.env[name];
  if (v == null || v === '') return defaultVal;
  return v === 'on' || v === 'true' || v === '1';
}

module.exports = {
  isCanonicalModuleGovernanceEnabled: () => _flag('IMPETUS_CANONICAL_MODULE_GOVERNANCE', false),
  isSidebarGovernanceRuntimeEnabled: () => _flag('IMPETUS_SIDEBAR_GOVERNANCE_RUNTIME', false),
  isLegacyModuleProtectionEnabled: () => _flag('IMPETUS_LEGACY_MODULE_PROTECTION', false),
  isContextualModuleHardeningEnabled: () => _flag('IMPETUS_CONTEXTUAL_MODULE_HARDENING', false),
  isSidebarObservabilityEnabled: () => _flag('IMPETUS_SIDEBAR_OBSERVABILITY', true),
  chatEnforcement: false,
  boundaryGovernance: false,
  autoRemediation: false,
  globalAutoPruning: false
};
