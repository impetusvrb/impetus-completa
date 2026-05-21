'use strict';

const flags = require('./config/phaseZ6FeatureFlags');
const { logPhaseZ6 } = require('./phaseZ6Logger');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { shouldEnforceKpis } = require('../kpiRuntimeEnforcement/tenantKpiEnforcementRuntime');
const { stabilizeKpiVisibility } = require('../kpiVisibilityStabilization/kpiVisibilityStabilizationFacade');
const { applyContextualMinimumProtection } = require('../kpiOperationalMinimums/contextualMinimumProtection');
const { hardenKpiUnderdelivery } = require('../kpiUnderdeliveryHardening/kpiUnderdeliveryHardeningFacade');
const { runKpiTargetingHardening } = require('../kpiTargetingHardening/kpiTargetingHardeningPack');
const { stabilizeDashboardKpis } = require('../kpiDashboardStabilization/dashboardKpiStabilizationFacade');
const { analyzeOperationalKpiQuality } = require('../kpiOperationalQuality/operationalKpiQualityFacade');
const { assessKpiRuntimeHealth } = require('./kpiRuntimeHealth');
const { assessKpiDeliveryConvergence } = require('./kpiDeliveryConvergence');

function isKpiStabilityContextActive(tenantId, ctx = {}) {
  return isPilotTenant(tenantId) && (shouldEnforceKpis(tenantId, ctx) || ctx.force_stability === true);
}

function runKpiRuntimeStabilityEngine(kpis = [], user = {}, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  if (!isKpiStabilityContextActive(tenantId, ctx)) {
    return { kpis, stability_applied: false, shadow_only: true };
  }

  const kpisBefore = ctx.kpis_before || ctx.kpi_enforcement?.pipeline?.before || kpis;
  const mergedCtx = {
    ...ctx,
    tenant_id: tenantId,
    kpis_before: kpisBefore,
    denied_kpi_keys: ctx.denied_kpi_keys || ctx.kpi_enforcement?.pipeline?.removed_keys || []
  };

  const underdelivery = hardenKpiUnderdelivery(kpis, mergedCtx);
  mergedCtx.critical_underdelivery = underdelivery.critical_blocked;

  const visibility = stabilizeKpiVisibility(user, kpis, mergedCtx);
  let current = visibility.stabilized_kpis || kpis;

  let minimum = { kpis: current };
  if (flags.isKpiUnderdeliveryHardeningEnabled() && underdelivery.critical_blocked) {
    minimum = applyContextualMinimumProtection(current, kpisBefore, mergedCtx);
    current = minimum.kpis;
    mergedCtx.emergency_minimum_applied = minimum.restored?.length > 0;
  }

  const targeting = runKpiTargetingHardening(user, current, mergedCtx);
  const dashboard = stabilizeDashboardKpis(current, mergedCtx);
  const quality = analyzeOperationalKpiQuality(current, mergedCtx);

  const healthPack = { visibility, dashboard, targeting, underdelivery };
  const health = assessKpiRuntimeHealth(healthPack);
  const convergence = assessKpiDeliveryConvergence(healthPack);

  if (flags.isKpiRuntimeStabilityObservabilityEnabled()) {
    logPhaseZ6('KPI_RUNTIME_STABILITY_ENGINE', {
      tenant_id: tenantId,
      kpi_count: current.length,
      health: health.health_score,
      shadow_only: !flags.isKpiVisibilityStabilizationEnabled()
    });
  }

  return {
    kpis: current,
    stability_applied:
      flags.isKpiVisibilityStabilizationEnabled() ||
      flags.isKpiUnderdeliveryHardeningEnabled() ||
      minimum.restored?.length > 0,
    visibility,
    underdelivery,
    minimum,
    targeting,
    dashboard,
    quality,
    health,
    convergence,
    fabricated: false,
    auto_remediate: false,
    auto_correct: false
  };
}

module.exports = { runKpiRuntimeStabilityEngine, isKpiStabilityContextActive };
