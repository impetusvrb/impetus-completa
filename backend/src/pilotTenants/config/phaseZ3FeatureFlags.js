'use strict';

function _flag(name, defaultOn = false) {
  const v = process.env[name];
  if (v === undefined || v === null || v === '') return defaultOn;
  return String(v).toLowerCase() === 'on' || String(v) === '1' || String(v) === 'true';
}

module.exports = {
  isPilotTenantEnforcementEnabled: () => _flag('IMPETUS_PILOT_TENANT_ENFORCEMENT', false),
  isMenuRuntimeStabilizationEnabled: () => _flag('IMPETUS_MENU_RUNTIME_STABILIZATION', false),
  isUnderdeliveryProtectionEnabled: () => _flag('IMPETUS_UNDERDELIVERY_PROTECTION', false),
  isDashboardGracefulStabilizationEnabled: () => _flag('IMPETUS_DASHBOARD_GRACEFUL_STABILIZATION', false),
  isPilotRuntimeObservabilityEnabled: () => _flag('IMPETUS_PILOT_RUNTIME_OBSERVABILITY', true)
};
