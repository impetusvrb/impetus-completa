'use strict';

const flags = require('./config/phaseZ13EnforcementFlags');
const { logPhaseZ13Enforcement } = require('./phaseZ13EnforcementLogger');
const { isPilotTenant, registerPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { getTenantEnforcementState } = require('../contextualActivation/tenantEnforcementState');

function coordinateRealTenantRuntimeActivation(tenantId, user = {}, ctx = {}) {
  if (!ctx.execute || !ctx.approved_by) {
    return { activated: false, prepared: true, reason: 'execute_and_approved_by_required' };
  }
  if (!flags.isRealTenantEnforcementEnabled() && !ctx.force_activation) {
    return { activated: false, reason: 'real_enforcement_flags_off' };
  }

  if (!isPilotTenant(tenantId)) {
    registerPilotTenant(tenantId, {
      approved_by: ctx.approved_by,
      channels_allowed: ctx.channels || ['menu', 'kpi', 'summary'],
      menu_only: ctx.menu_only !== false
    });
  }

  const channel = ctx.channel || 'menu';
  const contextual = require('../contextualActivation/tenantContextualEnforcementSupervisor');
  const activation = contextual.activateTenantEnforcement(tenantId, user, {
    ...ctx,
    execute: true,
    approved_by: ctx.approved_by,
    channel,
    force_activation: ctx.force_activation
  });

  if (!activation.activated) {
    return { activated: false, ...activation, shadow_only: true };
  }

  if (channel === 'menu' || ctx.activate_pilot_menu) {
    const pilot = require('../pilotTenants/tenantMenuActivationCoordinator');
    pilot.coordinatePilotMenuActivation(tenantId, user, {
      ...ctx,
      execute: true,
      approved_by: ctx.approved_by,
      force: ctx.force_activation
    });
  }

  if (channel === 'kpi' || ctx.kpis_before) {
    try {
      const kpiCoord = require('../kpiRuntimeEnforcement/tenantKpiActivationCoordinator');
      kpiCoord.coordinateTenantKpiActivation(tenantId, user, {
        ...ctx,
        execute: true,
        approved_by: ctx.approved_by,
        kpis_before: ctx.kpis_before
      });
    } catch {
      /* optional */
    }
  }

  const state = getTenantEnforcementState(tenantId);
  logPhaseZ13Enforcement('REAL_TENANT_RUNTIME_ACTIVATED', {
    tenant_id: tenantId,
    approved_by: ctx.approved_by,
    channel,
    channels: state.channels
  });

  return {
    activated: true,
    tenant_id: tenantId,
    approved_by: ctx.approved_by,
    channel,
    state,
    contextual_activation: activation,
    shadow_only: false,
    auto_execute: false,
    auto_remediate: false
  };
}

function rollbackRealTenantRuntime(tenantId, ctx = {}) {
  if (!ctx.execute || !ctx.approved_by) {
    return { rolled_back: false, prepared: true, reason: 'execute_and_approved_by_required' };
  }
  const contextual = require('../contextualActivation/tenantContextualEnforcementSupervisor');
  const deactivated = contextual.deactivateTenantEnforcement(tenantId, {
    execute: true,
    approved_by: ctx.approved_by
  });
  logPhaseZ13Enforcement('REAL_TENANT_RUNTIME_ROLLBACK', { tenant_id: tenantId, approved_by: ctx.approved_by });
  return { rolled_back: deactivated.deactivated, ...deactivated, graceful_restore: true };
}

module.exports = { coordinateRealTenantRuntimeActivation, rollbackRealTenantRuntime };
