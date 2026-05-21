'use strict';

const flags = require('./config/phaseZ9FeatureFlags');
const { logPhaseZ9 } = require('./phaseZ9Logger');
const { registerPilotTenant, isPilotTenant, getPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { validateTenantSummaryReadiness } = require('./tenantSummaryReadinessValidator');
const { setTenantEnforcementChannel } = require('../contextualActivation/tenantEnforcementState');
const { setSummaryActivationMeta } = require('./summaryRuntimeState');

function coordinateTenantSummaryActivation(tenantId, user, ctx = {}) {
  if (!ctx.execute || !ctx.approved_by) {
    return { activated: false, prepared: true, reason: 'execute_and_approved_by_required' };
  }
  if (
    (!flags.isSummaryRuntimeActivationEnabled() || !flags.isTenantSummaryEnforcementEnabled()) &&
    !ctx.force
  ) {
    return {
      activated: false,
      reason: 'IMPETUS_SUMMARY_RUNTIME_ACTIVATION_or_TENANT_SUMMARY_ENFORCEMENT=off'
    };
  }

  registerPilotTenant(tenantId, {
    approved_by: ctx.approved_by,
    label: ctx.label,
    channels_allowed: ['menu', 'kpi', 'summary'],
    menu_only: false
  });

  const readiness = validateTenantSummaryReadiness(tenantId, user, ctx);
  if (!readiness.ready && !ctx.force) {
    return {
      activated: false,
      reason: 'summary_not_ready',
      readiness,
      flow: ['readiness', 'rollback_check', 'activate']
    };
  }

  if (ctx.simulate_only === true) {
    return { activated: false, simulated: true, readiness, flow_step: 'simulation' };
  }

  const activation = require('../contextualActivation/contextualActivationFacade').activateTenantEnforcement(
    tenantId,
    user,
    {
      ...ctx,
      execute: true,
      approved_by: ctx.approved_by,
      channel: 'summary',
      channels: { menu: true, kpi: true, summary: true, dashboard: false },
      force_activation: ctx.force === true
    }
  );

  if (!activation.activated && !ctx.force) {
    return { activated: false, activation, pilot: isPilotTenant(tenantId) };
  }

  setTenantEnforcementChannel(tenantId, 'summary', true);

  const pilot = getPilotTenant(tenantId);
  if (pilot && ctx.summary_before) {
    pilot.summary_snapshot = ctx.summary_before;
    pilot.summary_activated_at = new Date().toISOString();
  }

  setSummaryActivationMeta(tenantId, {
    summary_activation_active: true,
    activated_at: new Date().toISOString(),
    approved_by: ctx.approved_by,
    summary_snapshot: ctx.summary_before || pilot?.summary_snapshot || null,
    rollback_marker: activation?.state?.rollback_marker || `z9-${Date.now()}`
  });

  logPhaseZ9('PILOT_SUMMARY_ACTIVATION', {
    tenant_id: tenantId,
    approved_by: ctx.approved_by,
    summary_only_channel: true
  });

  return {
    activated: true,
    tenant_id: tenantId,
    pilot: true,
    summary_channel: true,
    channels_blocked: ['chat'],
    activation,
    readiness,
    flow: ['readiness', 'rollback_check', 'activate', 'observe'],
    auto_execute: false
  };
}

function rollbackTenantSummary(tenantId, ctx = {}) {
  if (!ctx.execute || !ctx.approved_by) {
    return { rolled_back: false, prepared: true, reason: 'execute_and_approved_by_required' };
  }
  if (!isPilotTenant(tenantId)) {
    return { rolled_back: false, reason: 'not_pilot_tenant' };
  }

  setTenantEnforcementChannel(tenantId, 'summary', false);

  const pilot = getPilotTenant(tenantId);
  const meta = require('./summaryRuntimeState').getSummaryRuntimeMeta(tenantId);
  const restored = ctx.summary_before || pilot?.summary_snapshot || meta.summary_snapshot || null;

  setSummaryActivationMeta(tenantId, {
    summary_activation_active: false,
    activated_at: null
  });

  logPhaseZ9('PILOT_SUMMARY_ROLLBACK', { tenant_id: tenantId, approved_by: ctx.approved_by });

  return {
    rolled_back: true,
    tenant_id: tenantId,
    summary_channel_deactivated: true,
    summary_restored: restored,
    kpi_preserved: true,
    menu_preserved: true,
    chat_blocked: true,
    narrative_fabricated: false,
    auto_execute: false
  };
}

module.exports = { coordinateTenantSummaryActivation, rollbackTenantSummary };
