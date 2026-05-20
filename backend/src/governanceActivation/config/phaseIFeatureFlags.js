'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isControlledGovernanceActivationEnabled: () => _flag('IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION', false),
  isRuntimeGovernanceMonitoringEnabled: () => _flag('IMPETUS_RUNTIME_GOVERNANCE_MONITORING', false),
  isTenantSafeGovernanceEnabled: () => _flag('IMPETUS_TENANT_SAFE_GOVERNANCE', false)
};
