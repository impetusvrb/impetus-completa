'use strict';

const phaseP = require('./config/phasePFeatureFlags');
const { buildContextualTarget } = require('./enterpriseContextualTargetingEngine');
const { stabilizeHierarchy } = require('./hierarchyStabilizationEngine');
const { stabilizeFunctionalDomain } = require('./functionalDomainStabilizer');
const { targetModules } = require('./governedModuleTargeting');
const { stabilizeDashboardDelivery } = require('./dashboardDeliveryStabilizer');
const { resolveStabilizedKpis } = require('./stabilizedKpiResolver');
const { resolveStabilizedSummary } = require('./stabilizedSummaryResolver');
const { stabilizeInsights } = require('./contextualInsightStabilizer');
const { detectContextualConflict } = require('./contextualConflictDetector');
const { detectHierarchyConflict } = require('./hierarchyConflictDetector');
const { detectAuthorityConflict } = require('./authorityConflictDetector');
const { recordDeliveryStabilitySample, getDeliveryStabilityTelemetry } = require('./deliveryStabilityTelemetry');
const { resolveOperationalAuthority } = require('./operationalAuthorityResolver');

function isContextualStabilizationActive() {
  return (
    phaseP.isContextualStabilizationObservabilityEnabled() ||
    phaseP.isContextualDeliveryStabilizationEnabled() ||
    phaseP.isHierarchyStabilizationEnabled() ||
    phaseP.isFunctionalDomainStabilizationEnabled() ||
    phaseP.isGovernedModuleTargetingEnabled() ||
    phaseP.isDashboardStabilizationEnabled()
  );
}

function enrichWithContextualDeliveryStabilization(user, legacyResponse, ctx = {}) {
  if (!isContextualStabilizationActive() && !ctx.force) {
    return { response: legacyResponse, contextual_delivery: null };
  }

  const runtimeTruth = ctx.cognitive_convergence?.runtime_truth_state || legacyResponse.runtime_truth_state;
  const axis = legacyResponse.functional_axis || legacyResponse.functional_area || user?.functional_axis;
  const baseCtx = {
    functional_axis: axis,
    runtime_truth_state: runtimeTruth,
    runtime_truth_axis: runtimeTruth?.authority?.contextual_truth?.functional_axis || axis,
    hierarchy_band: null
  };

  const target = buildContextualTarget(user, { ...baseCtx, runtime_truth_state: runtimeTruth });
  baseCtx.hierarchy_band = target.targeting.hierarchy.hierarchy_band;
  baseCtx.domain = target.targeting.domain.domain;

  const modules = legacyResponse.visible_modules || [];
  const hierarchy = stabilizeHierarchy(user, modules, baseCtx);
  const domain = stabilizeFunctionalDomain(user, modules, baseCtx);
  const moduleTargeting = targetModules(modules, user, baseCtx);
  const widgets = legacyResponse.engine_v2?.payload?.layout?.widgets;
  let dashboard = null;
  if (widgets) {
    dashboard = stabilizeDashboardDelivery(user, widgets, baseCtx);
  }

  const authority = resolveOperationalAuthority(user, baseCtx);
  const contextualConflict = detectContextualConflict({
    domain_a: axis,
    domain_b: runtimeTruth?.authority?.contextual_truth?.functional_axis
  });
  const hierarchyConflict = detectHierarchyConflict({
    hierarchy_band: baseCtx.hierarchy_band,
    has_executive_module: modules.includes('executive')
  });
  const authorityConflict = detectAuthorityConflict({
    corporate_view: legacyResponse.corporate_aggregate,
    can_view_corporate: authority.can_view_corporate_aggregate
  });

  const stabilityScore = Number(
    (
      (hierarchy.hierarchy_integrity +
        domain.domain_integrity +
        moduleTargeting.module_targeting_precision +
        (dashboard?.dashboard_targeting_precision ?? 0.9)) /
      4
    ).toFixed(4)
  );

  recordDeliveryStabilitySample({
    contextual_delivery_stability: stabilityScore,
    hierarchy_integrity: hierarchy.hierarchy_integrity,
    authority_integrity: authority.authority_integrity,
    module_targeting_precision: moduleTargeting.module_targeting_precision,
    dashboard_targeting_precision: dashboard?.dashboard_targeting_precision ?? 0.9,
    contextual_delivery_confidence: target.contextual_delivery_confidence
  });

  const contextual_delivery_block = {
    phase: 'P',
    shadow_only: !phaseP.isContextualDeliveryStabilizationEnabled(),
    observability: phaseP.isContextualStabilizationObservabilityEnabled(),
    flags: {
      contextual_delivery: phaseP.isContextualDeliveryStabilizationEnabled(),
      hierarchy: phaseP.isHierarchyStabilizationEnabled(),
      functional_domain: phaseP.isFunctionalDomainStabilizationEnabled(),
      module_targeting: phaseP.isGovernedModuleTargetingEnabled(),
      dashboard: phaseP.isDashboardStabilizationEnabled()
    },
    targeting: target.targeting,
    contextual_delivery_confidence: target.contextual_delivery_confidence,
    ambiguous_targeting: target.ambiguous,
    hierarchy,
    domain,
    modules: moduleTargeting,
    dashboard,
    conflicts: {
      contextual: contextualConflict,
      hierarchy: hierarchyConflict,
      authority: authorityConflict
    },
    contextual_delivery_stability: stabilityScore,
    telemetry_snapshot: getDeliveryStabilityTelemetry(),
    auto_enforce: false
  };

  const response = { ...legacyResponse };
  if (phaseP.isGovernedModuleTargetingEnabled() && moduleTargeting.visible_modules) {
    response.visible_modules = moduleTargeting.visible_modules;
  }

  return { response, contextual_delivery: contextual_delivery_block };
}

function enrichKpiStabilization(user, kpis, ctx = {}) {
  if (!isContextualStabilizationActive() && !ctx.force) return { kpis, contextual_delivery: null };
  const resolved = resolveStabilizedKpis(kpis, user, ctx);
  recordDeliveryStabilitySample({ KPI_targeting_precision: resolved.KPI_targeting_precision });
  return {
    kpis: phaseP.isContextualDeliveryStabilizationEnabled() ? kpis : kpis,
    contextual_delivery: {
      kpi: resolved,
      shadow_only: !phaseP.isContextualDeliveryStabilizationEnabled()
    }
  };
}

function enrichSummaryStabilization(user, summary, ctx = {}) {
  if (!isContextualStabilizationActive() && !ctx.force) return { summary, contextual_delivery: null };
  const resolved = resolveStabilizedSummary(summary, user, ctx);
  recordDeliveryStabilitySample({ summary_targeting_precision: resolved.summary_targeting_precision });
  return {
    summary,
    contextual_delivery: {
      summary: resolved,
      shadow_only: !phaseP.isContextualDeliveryStabilizationEnabled()
    }
  };
}

function getContextualDeliveryReport() {
  return {
    telemetry: getDeliveryStabilityTelemetry(),
    flags: {
      IMPETUS_CONTEXTUAL_DELIVERY_STABILIZATION: phaseP.isContextualDeliveryStabilizationEnabled(),
      IMPETUS_HIERARCHY_STABILIZATION: phaseP.isHierarchyStabilizationEnabled(),
      IMPETUS_FUNCTIONAL_DOMAIN_STABILIZATION: phaseP.isFunctionalDomainStabilizationEnabled(),
      IMPETUS_GOVERNED_MODULE_TARGETING: phaseP.isGovernedModuleTargetingEnabled(),
      IMPETUS_DASHBOARD_STABILIZATION: phaseP.isDashboardStabilizationEnabled(),
      IMPETUS_CONTEXTUAL_STABILIZATION_OBSERVABILITY: phaseP.isContextualStabilizationObservabilityEnabled()
    },
    shadow_first: true
  };
}

module.exports = {
  isContextualStabilizationActive,
  enrichWithContextualDeliveryStabilization,
  enrichKpiStabilization,
  enrichSummaryStabilization,
  getContextualDeliveryReport,
  buildContextualTarget,
  targetModules,
  stabilizeHierarchy,
  stabilizeFunctionalDomain
};
