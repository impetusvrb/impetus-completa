'use strict';

const flags = require('./config/phaseZ3FeatureFlags');
const { logPhaseZ3 } = require('./phaseZ3Logger');
const { isPilotTenant } = require('./pilotTenantRegistry');
const { applyGovernedMenuPruning } = require('../contextualActivation/governedMenuPruningRuntime');
const { preserveGracefulMenu } = require('../menuRuntimeStabilization/gracefulMenuPreservation');
const { applyMenuFallbackProtection } = require('../menuRuntimeStabilization/menuFallbackProtection');
const { ensureMinimumOperationalVisibility } = require('../menuRuntimeStabilization/minimumOperationalVisibility');
const { guardDashboardSurvival } = require('../menuRuntimeStabilization/dashboardSurvivalGuard');
const { validateRuntimeMenuIntegrity } = require('../menuRuntimeStabilization/runtimeMenuIntegrityValidator');
const { protectAgainstUnderdelivery } = require('../underdeliveryProtection/underdeliveryProtectionFacade');
const { observeTenantEnforcement } = require('./tenantEnforcementObservation');

function runPilotMenuRuntimePipeline(modules = [], user = {}, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  if (!isPilotTenant(tenantId)) {
    return { visible_modules: modules, pilot_applied: false };
  }
  const state = require('../contextualActivation/tenantEnforcementState').getTenantEnforcementState(tenantId);
  const channelActive = state.enforcement_active && state.channels.menu;
  if (
    (!flags.isPilotTenantEnforcementEnabled() || !flags.isMenuRuntimeStabilizationEnabled()) &&
    !ctx.force_pilot_pipeline
  ) {
    return { visible_modules: modules, pilot_applied: false, shadow_only: true };
  }
  if (!channelActive && !ctx.force_pilot_pipeline) {
    return { visible_modules: modules, pilot_applied: false, reason: 'menu_channel_inactive' };
  }

  const before = [...modules];
  let current = [...modules];

  if (ctx.enforcement_prune !== false) {
    const pruned = applyGovernedMenuPruning(current, ctx);
    current = pruned.after;
  }

  const preserved = preserveGracefulMenu(current, ctx);
  current = preserved.after;

  const minimum = ensureMinimumOperationalVisibility(current, ctx);
  current = minimum.visible_modules;

  const fallback = applyMenuFallbackProtection(current, ctx);
  current = fallback.visible_modules;

  const survival = guardDashboardSurvival(current);
  current = survival.visible_modules;

  const underdelivery = protectAgainstUnderdelivery(current, {
    ...ctx,
    tenant_id: tenantId,
    leakage_probability: ctx.leakage_probability
  });

  if (underdelivery.risk.critical_underdelivery && flags.isUnderdeliveryProtectionEnabled()) {
    current = minimum.visible_modules;
  }

  const integrity = validateRuntimeMenuIntegrity(current);
  if (!integrity.valid) {
    const fb = applyMenuFallbackProtection([], ctx);
    current = fb.visible_modules;
  }

  const observation = observeTenantEnforcement(tenantId, before, current, ctx);

  if (flags.isPilotRuntimeObservabilityEnabled()) {
    logPhaseZ3('PILOT_MENU_RUNTIME_PIPELINE', {
      tenant_id: tenantId,
      before: before.length,
      after: current.length
    });
  }

  return {
    visible_modules: current,
    pilot_applied: true,
    before,
    observation,
    integrity,
    underdelivery,
    graceful: true,
    enforcement_applied: true
  };
}

module.exports = { runPilotMenuRuntimePipeline };
