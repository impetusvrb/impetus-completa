'use strict';

const flags = require('./config/phaseZ17FeatureFlags');
const { logPhaseZ17 } = require('./phaseZ17Logger');
const persistence = require('./tenantActivationPersistence');
const { registerPilotTenant, isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const {
  setTenantEnforcementActive,
  setTenantEnforcementChannel,
  getTenantEnforcementState
} = require('../contextualActivation/tenantEnforcementState');

function restoreTenantFromRecord(record = {}) {
  const tenantId = String(record.tenant_id);
  if (!tenantId || !record.pilot_active) {
    return { restored: false, reason: 'inactive_or_missing_tenant' };
  }

  registerPilotTenant(tenantId, {
    approved_by: record.activated_by,
    active: true,
    channels_allowed: record.channels_allowed || ['menu', 'kpi'],
    menu_only: record.menu_active && !record.kpi_active
  });

  const channels = {
    menu: record.menu_active === true,
    dashboard: record.menu_active === true,
    kpi: record.kpi_active === true,
    summary: record.summary_active === true
  };

  setTenantEnforcementActive(tenantId, true, {
    approved_by: record.activated_by || 'reload_recovery',
    channels,
    rollback_marker: `z17-recovery-${Date.now()}`
  });
  for (const [ch, on] of Object.entries(channels)) {
    if (on) setTenantEnforcementChannel(tenantId, ch, true);
  }

  return {
    restored: true,
    tenant_id: tenantId,
    state: getTenantEnforcementState(tenantId),
    governance_locked: record.governance_locked === true,
    terminal_governance_locked: record.terminal_governance_locked === true,
    auto_expansion: false
  };
}

function recoverApprovedPilotsOnBoot(ctx = {}) {
  if (!flags.isPilotReactivationEnabled() && !ctx.force_recovery) {
    return { recovered: false, reason: 'pilot_reactivation_off', tenants: [] };
  }

  const ready = persistence.listReloadRecoveryReady();
  const results = [];

  for (const record of ready) {
    try {
      const r = restoreTenantFromRecord(record);
      results.push(r);
      if (r.restored) {
        logPhaseZ17('PILOT_REACTIVATED_POST_RELOAD', {
          tenant_id: record.tenant_id,
          activated_by: record.activated_by
        });
      }
    } catch (e) {
      results.push({ restored: false, tenant_id: record.tenant_id, error: e.message });
    }
  }

  return {
    recovered: results.some((r) => r.restored),
    tenant_count: results.filter((r) => r.restored).length,
    tenants: results,
    reload_recovery_ready: true
  };
}

function recordPilotActivation(tenantId, meta = {}) {
  const record = persistence.normalizeTenantRecord({
    tenant_id: tenantId,
    pilot_active: true,
    menu_active: meta.menu_active !== false,
    kpi_active: meta.kpi_active === true,
    summary_active: meta.summary_active === true,
    governance_locked: meta.governance_locked !== false,
    terminal_governance_locked: meta.terminal_governance_locked !== false,
    activated_by: meta.approved_by || meta.activated_by,
    activated_at: new Date().toISOString(),
    reload_recovery_ready: meta.reload_recovery_ready !== false,
    channels_allowed: meta.channels || meta.channels_allowed || ['menu', 'kpi'],
    rollout_readiness: meta.rollout_readiness || 'pilot_validated'
  });

  const saved = persistence.saveTenantActivation(record);
  if (saved.saved && !isPilotTenant(tenantId)) {
    registerPilotTenant(tenantId, {
      approved_by: record.activated_by,
      channels_allowed: record.channels_allowed,
      active: true
    });
  }

  return { ...saved, in_memory_registered: isPilotTenant(tenantId) };
}

function coordinateSupervisedReactivation(tenantId, user = {}, ctx = {}) {
  if (!ctx.execute || !ctx.approved_by) {
    return { activated: false, prepared: true, reason: 'execute_and_approved_by_required' };
  }
  if (!flags.isPilotReactivationEnabled() && !ctx.force_reactivation) {
    return { activated: false, reason: 'pilot_reactivation_off' };
  }

  let runtimeActivation = { activated: false };
  try {
    const coord = require('../realTenantEnforcement/tenantRuntimeActivationCoordinator');
    runtimeActivation = coord.coordinateRealTenantRuntimeActivation(tenantId, user, {
      ...ctx,
      execute: true,
      approved_by: ctx.approved_by,
      channel: ctx.channel || 'menu',
      channels: ctx.channels
    });
  } catch (e) {
    return { activated: false, error: e.message };
  }

  const persist = recordPilotActivation(tenantId, {
    approved_by: ctx.approved_by,
    menu_active: ctx.menu_active !== false,
    kpi_active: ctx.kpi_active === true || ctx.channel === 'kpi',
    summary_active: ctx.summary_active === true || ctx.channel === 'summary',
    governance_locked: ctx.governance_locked !== false,
    terminal_governance_locked: ctx.terminal_governance_locked !== false,
    channels: ctx.channels || ['menu', 'kpi']
  });

  return {
    ...runtimeActivation,
    persistence: persist,
    reload_recovery_ready: true,
    auto_expansion: false
  };
}

module.exports = {
  restoreTenantFromRecord,
  recoverApprovedPilotsOnBoot,
  recordPilotActivation,
  coordinateSupervisedReactivation
};
