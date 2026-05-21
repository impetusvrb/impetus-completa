'use strict';

const flags = require('./config/phaseZ3FeatureFlags');
const { isPilotTenant, listPilotTenants, registerPilotTenant } = require('./pilotTenantRegistry');
const { supervisePilotTenant } = require('./pilotTenantSupervisor');
const { coordinatePilotMenuActivation } = require('./tenantMenuActivationCoordinator');
const { rollbackPilotMenu } = require('./tenantMenuRollbackCoordinator');
const { runPilotMenuRuntimePipeline } = require('./pilotMenuRuntimePipeline');
const { stabilizeDashboard } = require('../dashboardStabilization/dashboardStabilizationFacade');

function getPilotTenantStatus(ctx = {}) {
  return {
    phase: 'Z.3',
    layer: 'pilot-tenant-enforcement',
    pilot_enforcement: flags.isPilotTenantEnforcementEnabled(),
    menu_stabilization: flags.isMenuRuntimeStabilizationEnabled(),
    underdelivery: flags.isUnderdeliveryProtectionEnabled(),
    dashboard_stabilization: flags.isDashboardGracefulStabilizationEnabled(),
    observability: flags.isPilotRuntimeObservabilityEnabled(),
    pilots: listPilotTenants(),
    menu_only: true,
    global_activation: false
  };
}

function applyPilotRuntimeToDashboard(user, legacyResponse, ctx = {}) {
  const tenantId = user?.company_id;
  if (!isPilotTenant(tenantId) && !ctx.force_pilot) {
    return { response: legacyResponse, pilot_runtime: null };
  }

  let identity = { canonical_identity: {} };
  try {
    identity = require('../operationalIdentity/operationalIdentityFacade').resolveIdentityForUser(user, {
      visible_modules: legacyResponse.visible_modules,
      profile_code: legacyResponse.profile_code
    });
  } catch {
    /* optional */
  }

  const mergedCtx = {
    ...ctx,
    canonical_identity: identity.canonical_identity,
    visible_modules: legacyResponse.visible_modules,
    profile_code: legacyResponse.profile_code
  };

  const menuPipeline = runPilotMenuRuntimePipeline(legacyResponse.visible_modules || [], user, mergedCtx);
  const response = { ...legacyResponse };
  if (menuPipeline.pilot_applied) {
    response.visible_modules = menuPipeline.visible_modules;
  }

  const dashStab = stabilizeDashboard(response, user, mergedCtx);

  const pilot_runtime = {
    phase: 'Z.3',
    pilot: true,
    tenant_id: tenantId,
    menu_pipeline: menuPipeline,
    dashboard_stabilization: dashStab,
    visible_modules_before: menuPipeline.before,
    graceful_degradation: true,
    auto_remediate: false
  };

  return { response, pilot_runtime };
}

function getPilotTenantReport(user, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  return {
    ok: true,
    status: getPilotTenantStatus(),
    supervision: supervisePilotTenant(tenantId, user, ctx)
  };
}

module.exports = {
  getPilotTenantStatus,
  registerPilotTenant,
  isPilotTenant,
  supervisePilotTenant,
  coordinatePilotMenuActivation,
  rollbackPilotMenu,
  applyPilotRuntimeToDashboard,
  getPilotTenantReport,
  runPilotMenuRuntimePipeline
};
