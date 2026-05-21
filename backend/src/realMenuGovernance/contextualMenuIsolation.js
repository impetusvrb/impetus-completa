'use strict';

const { enforceTenantModuleIsolation } = require('../realTenantEnforcement/tenantModuleIsolationEnforcer');

function applyContextualMenuIsolation(modules = [], ctx = {}) {
  return enforceTenantModuleIsolation(modules, {
    ...ctx,
    tenant_pilot_enabled: true
  });
}

module.exports = { applyContextualMenuIsolation };
