'use strict';

const flags = require('../pilotMaturity/config/phaseZ4FeatureFlags');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { assessPilotMaturity } = require('../pilotMaturity/pilotMaturityFacade');
const { stabilizeMenuEnforcement } = require('../menuEnforcementStabilization/menuEnforcementStabilizationFacade');
const { prepareKpiEnforcement } = require('../kpiEnforcementPreparation/kpiPreparationFacade');
const { analyzeDeliveryQuality } = require('../deliveryQuality/deliveryQualityFacade');
const { assessTenantTargetingConvergence } = require('../targetingConvergence/tenantTargetingConvergence');
const { consolidatePilotObservability } = require('../pilotObservability/pilotObservabilityFacade');
const { protectAgainstUnderdelivery } = require('../underdeliveryProtection/underdeliveryProtectionFacade');

let _rollbackSafety = null;
try {
  _rollbackSafety = require('../pilotTenants/pilotTenantRollbackSafety');
} catch {
  _rollbackSafety = { assessPilotRollbackSafety: () => ({ rollback_ready: true }) };
}

function getOperationalStabilizationStatus(ctx = {}) {
  return {
    phase: 'Z.4',
    layer: 'pilot-operational-stabilization',
    maturity_engine: flags.isPilotMaturityEngineEnabled(),
    menu_stability_analysis: flags.isMenuStabilityAnalysisEnabled(),
    kpi_preparation: flags.isKpiEnforcementPreparationEnabled(),
    delivery_quality: flags.isDeliveryQualityAnalysisEnabled(),
    targeting_convergence: flags.isTargetingConvergenceValidationEnabled(),
    observability: flags.isPilotObservabilityEnabled(),
    kpi_enforcement_applied: false,
    menu_only_enforcement: true,
    recommendation_only: true
  };
}

function stabilizePilotOperational(user, legacyResponse = {}, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  if (!isPilotTenant(tenantId) && !ctx.force) {
    return { response: legacyResponse, pilot_operational_stabilization: null };
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
    tenant_id: tenantId,
    canonical_identity: identity.canonical_identity,
    visible_modules: legacyResponse.visible_modules,
    profile_code: legacyResponse.profile_code,
    dashboard_payload: ctx.dashboard_payload || { kpis: legacyResponse.kpis, sections: legacyResponse.sections }
  };

  const beforeModules = ctx.visible_modules_before || legacyResponse.visible_modules || [];
  const afterModules = legacyResponse.visible_modules || [];

  const menuStabilization = stabilizeMenuEnforcement(beforeModules, afterModules, mergedCtx);
  const underdelivery = protectAgainstUnderdelivery(afterModules, mergedCtx);
  const targeting = assessTenantTargetingConvergence(tenantId, user, {
    ...mergedCtx,
    menu_stability: menuStabilization.menu_stability
  });

  const maturityCtx = {
    ...mergedCtx,
    menu_stability: menuStabilization.menu_stability,
    underdelivery,
    targeting
  };
  const maturity = assessPilotMaturity(tenantId, user, maturityCtx);

  const kpiPrep = prepareKpiEnforcement(user, mergedCtx.dashboard_payload, {
    ...mergedCtx,
    maturity: maturity.pilot ? maturity : {}
  });

  const deliveryQuality = analyzeDeliveryQuality(user, mergedCtx);
  const rollback = _rollbackSafety.assessPilotRollbackSafety
    ? _rollbackSafety.assessPilotRollbackSafety(tenantId, ctx)
    : { rollback_ready: true };

  const observability = consolidatePilotObservability(tenantId, {
    tenant_id: tenantId,
    maturity: maturity.pilot ? maturity : null,
    menu_stabilization: menuStabilization,
    kpi_preparation: kpiPrep,
    delivery_quality: deliveryQuality,
    targeting,
    underdelivery,
    rollback_ready: rollback.rollback_ready !== false,
    degradation_safe: menuStabilization.menu_stability?.stable !== false
  });

  const pilot_operational_stabilization = {
    phase: 'Z.4',
    pilot: true,
    tenant_id: tenantId,
    maturity: maturity.pilot ? maturity : { pilot: false },
    menu_stabilization: menuStabilization,
    kpi_preparation: kpiPrep,
    delivery_quality: deliveryQuality,
    targeting,
    underdelivery,
    observability,
    kpi_enforcement_applied: false,
    payload_unchanged: true,
    graceful_degradation: true,
    recommendation_only: true
  };

  return { response: legacyResponse, pilot_operational_stabilization };
}

module.exports = {
  getOperationalStabilizationStatus,
  stabilizePilotOperational
};
