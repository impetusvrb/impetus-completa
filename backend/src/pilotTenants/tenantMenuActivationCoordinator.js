'use strict';

const flags = require('./config/phaseZ3FeatureFlags');
const { logPhaseZ3 } = require('./phaseZ3Logger');
const { registerPilotTenant, isPilotTenant } = require('./pilotTenantRegistry');
const { assessPilotTenantReadiness } = require('./pilotTenantReadiness');

function coordinatePilotMenuActivation(tenantId, user, ctx = {}) {
  if (!ctx.execute || !ctx.approved_by) {
    return { activated: false, prepared: true, reason: 'execute_and_approved_by_required' };
  }
  if (!flags.isPilotTenantEnforcementEnabled() && !ctx.force) {
    return { activated: false, reason: 'IMPETUS_PILOT_TENANT_ENFORCEMENT=off' };
  }

  registerPilotTenant(tenantId, { approved_by: ctx.approved_by, label: ctx.label });

  const readiness = assessPilotTenantReadiness(tenantId, user, ctx);
  if (!readiness.enforcement_ready && !ctx.force) {
    return { activated: false, reason: 'pilot_not_ready', readiness };
  }

  const activation = require('../contextualActivation/contextualActivationFacade').activateTenantEnforcement(
    tenantId,
    user,
    {
      ...ctx,
      execute: true,
      approved_by: ctx.approved_by,
      channel: 'menu',
      channels: { menu: true, dashboard: false, kpi: false, summary: false },
      force_activation: ctx.force === true,
      visible_modules: ctx.visible_modules
    }
  );

  if (!activation.activated) {
    return { activated: false, activation, pilot: isPilotTenant(tenantId) };
  }

  logPhaseZ3('PILOT_MENU_ACTIVATION', {
    tenant_id: tenantId,
    approved_by: ctx.approved_by,
    menu_only: true
  });

  return {
    activated: true,
    tenant_id: tenantId,
    pilot: true,
    menu_only: true,
    channels_blocked: ['dashboard', 'kpi', 'summary'],
    activation,
    readiness,
    auto_execute: false
  };
}

module.exports = { coordinatePilotMenuActivation };
