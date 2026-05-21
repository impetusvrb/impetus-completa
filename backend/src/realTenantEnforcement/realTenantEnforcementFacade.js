'use strict';

const flags = require('./config/phaseZ13EnforcementFlags');
const { logPhaseZ13Enforcement } = require('./phaseZ13EnforcementLogger');
const { isRealEnforcementActiveForTenant, superviseRealTenantEnforcement } = require('./realTenantEnforcementSupervisor');
const { coordinateRealTenantRuntimeActivation, rollbackRealTenantRuntime } = require('./tenantRuntimeActivationCoordinator');
const { resolveGovernedIdentityForUser } = require('../operationalIdentityGovernance/operationalIdentityGovernanceFacade');
const { applyRealMenuGovernance } = require('../realMenuGovernance/realMenuGovernanceFacade');
const { applyRealKpiTargeting } = require('../realKpiTargeting/realKpiTargetingFacade');
const { applyRealSummaryTargeting } = require('../realSummaryTargeting/realSummaryTargetingFacade');
const { analyzeOperationalLeakageReport } = require('../operationalLeakage/operationalLeakageFacade');

function isRealTenantEnforcementLayerActive() {
  return (
    flags.isRealTenantEnforcementEnabled() ||
    flags.isSafeMenuEnforcementEnabled() ||
    flags.isKpiRuntimeEnforcementEnabled()
  );
}

function getRealTenantEnforcementStatus(ctx = {}) {
  return {
    phase: 'Z.13',
    layer: 'real-tenant-enforcement',
    real_enforcement: flags.isRealTenantEnforcementEnabled(),
    menu: flags.isSafeMenuEnforcementEnabled(),
    kpi: flags.isKpiRuntimeEnforcementEnabled(),
    summary: flags.isSummaryRuntimeObservabilityEnabled(),
    chat_enforcement: flags.chatEnforcement,
    boundary_governance: flags.boundaryGovernance,
    auto_remediate: flags.autoRemediation,
    global_auto_pruning: flags.globalAutoPruning,
    tenant_id: ctx.tenant_id
  };
}

function applyRealEnforcementToDashboard(user = {}, legacyResponse = {}, ctx = {}) {
  if (!isRealTenantEnforcementLayerActive() && !ctx.force) {
    return {
      response: legacyResponse,
      real_tenant_enforcement: null,
      operational_leakage: null
    };
  }

  const tenantId = user?.company_id || ctx.tenant_id;
  const identityPack = resolveGovernedIdentityForUser(user, {
    ...ctx,
    visible_modules: legacyResponse.visible_modules,
    profile_code: legacyResponse.profile_code
  });
  const mergedCtx = {
    ...ctx,
    tenant_id: tenantId,
    canonical_identity: identityPack.canonical_identity,
    profile_code: legacyResponse.profile_code,
    visible_modules: legacyResponse.visible_modules
  };

  const response = { ...legacyResponse };
  const modulesBefore = [...(legacyResponse.visible_modules || [])];
  let menuResult = { visible_modules: modulesBefore, enforcement_applied: false, shadow_only: true };
  let kpiResult = null;
  let summaryResult = null;

  if (isRealEnforcementActiveForTenant(tenantId, mergedCtx) || ctx.force_real_enforcement) {
    menuResult = applyRealMenuGovernance(modulesBefore, user, mergedCtx);
    if (menuResult.enforcement_applied) {
      response.visible_modules = menuResult.visible_modules;
    }

    if (Array.isArray(response.kpis) && response.kpis.length) {
      kpiResult = applyRealKpiTargeting(user, response.kpis, mergedCtx);
      if (kpiResult.enforcement_applied) response.kpis = kpiResult.kpis;
    }

    const summaryPayload = response.intelligent_summary || response.summary_block || null;
    if (summaryPayload && typeof summaryPayload === 'object') {
      summaryResult = applyRealSummaryTargeting(user, summaryPayload, mergedCtx);
      if (summaryResult.enforcement_applied && response.intelligent_summary) {
        response.intelligent_summary = summaryResult.payload;
      }
    }

    if (menuResult.enforcement_applied && flags.isRealTenantEnforcementEnabled()) {
      logPhaseZ13Enforcement('REAL_ENFORCEMENT_APPLIED', {
        tenant_id: tenantId,
        modules_before: modulesBefore.length,
        modules_after: (response.visible_modules || []).length,
        pruned: menuResult.pruned_count
      });
    }
  }

  const leakage = analyzeOperationalLeakageReport(user, {
    ...mergedCtx,
    visible_modules: response.visible_modules,
    kpis: response.kpis,
    delivery: response
  });

  const real_tenant_enforcement = {
    phase: 'Z.13',
    tenant_id: tenantId,
    real_enforcement_active: isRealEnforcementActiveForTenant(tenantId, mergedCtx),
    identity: identityPack,
    menu: menuResult,
    kpi: kpiResult,
    summary: summaryResult,
    supervision: superviseRealTenantEnforcement(tenantId, user, mergedCtx),
    shadow_only: menuResult.shadow_only,
    graceful_degradation: true,
    auto_remediate: false,
    chat_enforcement: false,
    boundary_enforcement: false
  };

  return { response, real_tenant_enforcement, operational_leakage: leakage };
}

function getRealTenantEnforcementReport(user = {}, ctx = {}) {
  return { ok: true, ...applyRealEnforcementToDashboard(user, ctx.legacy || {}, ctx) };
}

module.exports = {
  isRealTenantEnforcementLayerActive,
  getRealTenantEnforcementStatus,
  applyRealEnforcementToDashboard,
  getRealTenantEnforcementReport,
  activateRealTenantEnforcement: coordinateRealTenantRuntimeActivation,
  rollbackRealTenantEnforcement: rollbackRealTenantRuntime,
  superviseRealTenantEnforcement
};
