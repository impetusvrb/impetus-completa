'use strict';

const flags = require('./config/phaseZ5FeatureFlags');
const { logPhaseZ5 } = require('./phaseZ5Logger');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { pruneContextualKpis } = require('./contextualKpiPruningRuntime');
const { applyGovernedKpiVisibility } = require('./governedKpiVisibilityRuntime');
const { applyContextualKpiGracefulDegradation } = require('../kpiGracefulPreservation/contextualKpiGracefulDegradation');
const { guardDashboardKpiIntegrity } = require('../kpiGracefulPreservation/dashboardKpiIntegrityGuard');
const { kpiKey } = require('./domainKpiIsolation');

function shouldEnforceKpis(tenantId, ctx = {}) {
  if (!isPilotTenant(tenantId) && !ctx.force_kpi_pipeline) return false;
  if (
    (!flags.isKpiRuntimeEnforcementEnabled() || !flags.isTenantKpiEnforcementEnabled()) &&
    !ctx.force_kpi_pipeline
  ) {
    return false;
  }
  const state = require('../contextualActivation/tenantEnforcementState').getTenantEnforcementState(tenantId);
  return (state.enforcement_active && state.channels.kpi) || ctx.force_kpi_pipeline === true;
}

function runTenantKpiEnforcementRuntime(kpis = [], user = {}, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  const before = [...kpis];

  if (!shouldEnforceKpis(tenantId, ctx)) {
    return { kpis: before, enforcement_applied: false, shadow_only: true };
  }

  let current = [...kpis];
  const pruned = pruneContextualKpis(current, user, ctx);
  current = pruned.kpis;
  const governed = applyGovernedKpiVisibility(current, user, ctx);
  current = governed.kpis;

  const deniedIds = [
    ...(pruned.domain_removed || []).map((r) => r.kpi_id),
    ...(pruned.hierarchy_removed || []).map((r) => r.kpi_id),
    ...(governed.denied || [])
  ];
  const degraded = applyContextualKpiGracefulDegradation(current, before, {
    ...ctx,
    denied_kpi_keys: deniedIds,
    removed_kpi_ids: deniedIds
  });
  current = degraded.kpis;

  const integrity = guardDashboardKpiIntegrity(current);
  if (integrity.dashboard_empty && before.length > 0) {
    current = before.slice(0, Math.min(3, before.length));
    integrity.emergency_restore = true;
  }

  if (flags.isKpiPilotObservabilityEnabled()) {
    logPhaseZ5('KPI_RUNTIME_ENFORCEMENT_APPLIED', {
      tenant_id: tenantId,
      before: before.length,
      after: current.length,
      pruned: pruned.pruned_count
    });
  }

  return {
    kpis: current,
    enforcement_applied: true,
    before,
    before_count: before.length,
    after_count: current.length,
    pruned,
    governed,
    graceful: degraded,
    integrity,
    removed_keys: before.filter((k) => !current.some((c) => kpiKey(c) === kpiKey(k))).map(kpiKey),
    fabricated: false,
    auto_remediate: false
  };
}

module.exports = { runTenantKpiEnforcementRuntime, shouldEnforceKpis };
