'use strict';

const { applyTenantOperationalVisibility } = require('../realTenantEnforcement/tenantOperationalVisibilityRuntime');
const { validateRuntimeMenuIntegrity } = require('../menuRuntimeStabilization/runtimeMenuIntegrityValidator');

function stabilizeMenuGovernance(modules = [], ctx = {}) {
  const visibility = applyTenantOperationalVisibility(modules, ctx);
  const integrity = validateRuntimeMenuIntegrity(visibility.visible_modules);
  return {
    visible_modules: integrity.valid ? visibility.visible_modules : ['dashboard', 'settings'],
    integrity,
    visibility,
    stable: integrity.valid
  };
}

module.exports = { stabilizeMenuGovernance };
