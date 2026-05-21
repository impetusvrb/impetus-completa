'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isContextualEnforcementActivationEnabled: () => _flag('IMPETUS_CONTEXTUAL_ENFORCEMENT_ACTIVATION', false),
  isTenantContextualEnforcementEnabled: () => _flag('IMPETUS_TENANT_CONTEXTUAL_ENFORCEMENT', false),
  isSafeMenuEnforcementEnabled: () => _flag('IMPETUS_SAFE_MENU_ENFORCEMENT', false),
  isContextualActivationObservabilityEnabled: () => _flag('IMPETUS_CONTEXTUAL_ENFORCEMENT_OBSERVABILITY', true)
};
