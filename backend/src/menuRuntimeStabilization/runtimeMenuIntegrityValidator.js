'use strict';

const { MINIMUM_MODULES } = require('../pilotTenants/pilotTenantRegistry');

function validateRuntimeMenuIntegrity(modules = []) {
  const list = Array.isArray(modules) ? modules : [];
  const hasDashboard = list.includes('dashboard');
  const hasSettings = list.includes('settings');
  const valid = hasDashboard && list.length >= 1;

  return {
    valid,
    has_dashboard: hasDashboard,
    has_settings: hasSettings,
    module_count: list.length,
    minimum_satisfied: MINIMUM_MODULES.every((m) => list.includes(m)),
    broken_menu: !hasDashboard && list.length > 0
  };
}

module.exports = { validateRuntimeMenuIntegrity };
