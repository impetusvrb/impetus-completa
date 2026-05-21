'use strict';

const flags = require('./config/phaseZ2FeatureFlags');
const { logPhaseZ2 } = require('./phaseZ2Logger');
const { applyGovernedMenuPruning } = require('./governedMenuPruningRuntime');
const { getTenantEnforcementState } = require('./tenantEnforcementState');

function applySafeMenuVisibility(modules = [], user = {}, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  const state = getTenantEnforcementState(tenantId);
  const globalOn = flags.isSafeMenuEnforcementEnabled() && flags.isTenantContextualEnforcementEnabled();
  const tenantOn = state.enforcement_active && state.channels.menu;

  if (!globalOn || !tenantOn) {
    return {
      visible_modules: modules,
      enforcement_applied: false,
      shadow_only: !tenantOn,
      menu_channel_active: state.channels.menu
    };
  }

  const pruned = applyGovernedMenuPruning(modules, {
    ...ctx,
    canonical_identity: ctx.canonical_identity,
    tenant_id: tenantId
  });

  if (pruned.pruned_count > 0 && flags.isContextualActivationObservabilityEnabled()) {
    logPhaseZ2('SAFE_MENU_ENFORCEMENT_APPLIED', {
      tenant_id: tenantId,
      pruned: pruned.pruned_count,
      modules: pruned.pruned_modules
    });
  }

  return {
    visible_modules: pruned.after,
    enforcement_applied: true,
    graceful_degradation: true,
    pruning: pruned,
    legacy_preserved_in_meta: pruned.before
  };
}

module.exports = { applySafeMenuVisibility };
