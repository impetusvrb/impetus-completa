'use strict';

const flags = require('./config/phaseZ5FeatureFlags');
const { logPhaseZ5 } = require('./phaseZ5Logger');
const { registerPilotTenant, isPilotTenant, getPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { validateTenantKpiReadiness } = require('./tenantKpiReadinessValidator');
const { setTenantEnforcementChannel } = require('../contextualActivation/tenantEnforcementState');

function coordinateTenantKpiActivation(tenantId, user, ctx = {}) {
  if (!ctx.execute || !ctx.approved_by) {
    return { activated: false, prepared: true, reason: 'execute_and_approved_by_required' };
  }
  if (
    (!flags.isKpiRuntimeEnforcementEnabled() || !flags.isTenantKpiEnforcementEnabled()) &&
    !ctx.force
  ) {
    return { activated: false, reason: 'IMPETUS_KPI_RUNTIME_ENFORCEMENT_or_TENANT_KPI_ENFORCEMENT=off' };
  }

  registerPilotTenant(tenantId, {
    approved_by: ctx.approved_by,
    label: ctx.label,
    channels_allowed: ['menu', 'kpi'],
    menu_only: false
  });

  const readiness = validateTenantKpiReadiness(tenantId, user, ctx);
  if (!readiness.ready && !ctx.force) {
    return { activated: false, reason: 'kpi_not_ready', readiness, flow: ['readiness', 'simulation', 'activate'] };
  }

  if (ctx.simulate_only === true) {
    return {
      activated: false,
      simulated: true,
      readiness,
      preparation: readiness.preparation,
      flow_step: 'simulation'
    };
  }

  const activation = require('../contextualActivation/contextualActivationFacade').activateTenantEnforcement(
    tenantId,
    user,
    {
      ...ctx,
      execute: true,
      approved_by: ctx.approved_by,
      channel: 'kpi',
      channels: { menu: true, kpi: true, dashboard: false, summary: false },
      force_activation: ctx.force === true
    }
  );

  if (!activation.activated && !ctx.force) {
    return { activated: false, activation, pilot: isPilotTenant(tenantId) };
  }

  setTenantEnforcementChannel(tenantId, 'kpi', true);

  const pilot = getPilotTenant(tenantId);
  if (pilot && ctx.kpis_before) {
    pilot.kpi_snapshot = ctx.kpis_before;
    pilot.kpi_activated_at = new Date().toISOString();
  }

  logPhaseZ5('PILOT_KPI_ACTIVATION', {
    tenant_id: tenantId,
    approved_by: ctx.approved_by,
    kpi_only: true
  });

  return {
    activated: true,
    tenant_id: tenantId,
    pilot: true,
    kpi_only: true,
    channels_blocked: ['summary', 'chat'],
    activation,
    readiness,
    flow: ['readiness', 'simulation', 'activate', 'observe'],
    auto_execute: false
  };
}

module.exports = { coordinateTenantKpiActivation };
