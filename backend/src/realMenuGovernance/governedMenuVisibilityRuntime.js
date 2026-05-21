'use strict';

const flags = require('../realTenantEnforcement/config/phaseZ13EnforcementFlags');
const { applySafeMenuVisibility } = require('../contextualActivation/safeMenuVisibilityRuntime');
const { runPilotMenuRuntimePipeline } = require('../pilotTenants/pilotMenuRuntimePipeline');
const { isRealEnforcementActiveForTenant } = require('../realTenantEnforcement/realTenantEnforcementSupervisor');

function applyGovernedMenuVisibility(modules = [], user = {}, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  const before = [...modules];

  if (!isRealEnforcementActiveForTenant(tenantId, ctx) && !ctx.force_real_menu) {
    return {
      visible_modules: before,
      enforcement_applied: false,
      shadow_only: true,
      reason: 'real_enforcement_inactive'
    };
  }

  let current = before;
  const safe = applySafeMenuVisibility(current, user, { ...ctx, tenant_id: tenantId });
  if (safe.enforcement_applied) current = safe.visible_modules;

  const pilot = runPilotMenuRuntimePipeline(current, user, {
    ...ctx,
    tenant_id: tenantId,
    force_pilot_pipeline: true,
    enforcement_prune: true
  });
  if (pilot.pilot_applied) current = pilot.visible_modules;

  return {
    visible_modules: current,
    before,
    enforcement_applied: true,
    shadow_only: false,
    safe_menu: safe,
    pilot_pipeline: pilot,
    flags_active: flags.isSafeMenuEnforcementEnabled(),
    graceful_degradation: true
  };
}

module.exports = { applyGovernedMenuVisibility };
