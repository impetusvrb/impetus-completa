'use strict';

const flags = require('./config/phaseZ2FeatureFlags');
const { applySafeMenuVisibility } = require('./safeMenuVisibilityRuntime');
const { getTenantEnforcementState } = require('./tenantEnforcementState');

function coordinateTenantVisibility(user = {}, legacyResponse = {}, ctx = {}) {
  const tenantId = user?.company_id;
  const state = getTenantEnforcementState(tenantId);
  const modules = legacyResponse.visible_modules || [];

  const menu = applySafeMenuVisibility(modules, user, {
    ...ctx,
    visible_modules: modules,
    tenant_id: tenantId
  });

  const coordinated = {
    tenant_id: tenantId,
    enforcement_active: state.enforcement_active,
    channels: state.channels,
    visible_modules_before: modules,
    visible_modules_after: menu.visible_modules,
    menu_enforcement: menu,
    enforcement_applied: menu.enforcement_applied,
    global_flags: {
      activation: flags.isContextualEnforcementActivationEnabled(),
      tenant: flags.isTenantContextualEnforcementEnabled(),
      menu: flags.isSafeMenuEnforcementEnabled()
    }
  };

  return coordinated;
}

module.exports = { coordinateTenantVisibility };
