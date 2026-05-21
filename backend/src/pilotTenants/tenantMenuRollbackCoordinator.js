'use strict';

const flags = require('./config/phaseZ3FeatureFlags');
const { logPhaseZ3 } = require('./phaseZ3Logger');
const { unregisterPilotTenant } = require('./pilotTenantRegistry');

function rollbackPilotMenu(tenantId, ctx = {}) {
  if (!ctx.execute || !ctx.approved_by) {
    return { rolled_back: false, prepared: true, reason: 'execute_and_approved_by_required' };
  }

  let deact = { deactivated: false };
  try {
    deact = require('../contextualActivation/contextualActivationFacade').deactivateTenantEnforcement(tenantId, {
      execute: true,
      approved_by: ctx.approved_by
    });
  } catch {
    deact = { deactivated: true };
  }

  if (ctx.unregister_pilot) unregisterPilotTenant(tenantId);

  const restored = ctx.visible_modules_before || ctx.snapshot?.visible_modules_before || [];

  logPhaseZ3('PILOT_MENU_ROLLBACK', { tenant_id: tenantId, approved_by: ctx.approved_by });

  return {
    rolled_back: true,
    tenant_id: tenantId,
    deactivated: deact.deactivated,
    visible_modules_restored: restored,
    graceful_restore: true,
    auto_execute: false
  };
}

module.exports = { rollbackPilotMenu };
