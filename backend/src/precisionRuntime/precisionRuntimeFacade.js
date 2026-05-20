'use strict';

const phaseL = require('./config/phaseLFeatureFlags');
const { deliverModules } = require('./preciseModuleDeliveryEngine');
const { computeToolVisibility } = require('./governedToolVisibilityEngine');
const { governContextualDelivery } = require('./governedContextualDelivery');
const { applyCardPrecision } = require('./governedCardPrecisionEngine');
const { resolvePreciseKpis } = require('./preciseKpiResolver');
const { resolvePreciseSummary } = require('./preciseSummaryEngine');
const { validatePrecisionRuntime } = require('./precisionRuntimeValidator');
const { buildDeliveryExplainabilityReport, explainModule } = require('./deliveryExplainabilityEngine');
const { recordDeliverySample, getDeliveryTelemetry } = require('./runtimeDeliveryTelemetry');
const { listPrecisionAudit } = require('./runtimePrecisionAuditTrail');

function isPrecisionLayerActive() {
  return (
    phaseL.isRuntimePrecisionObservabilityEnabled() ||
    phaseL.isPreciseModuleDeliveryEnabled() ||
    phaseL.isPreciseToolExposureEnabled() ||
    phaseL.isPreciseWidgetGovernanceEnabled() ||
    phaseL.isPreciseKpiAlignmentEnabled() ||
    phaseL.isPreciseSummaryEngineEnabled()
  );
}

function enrichDashboardMePrecision(user, legacyResponse, ctx = {}) {
  if (!isPrecisionLayerActive() && !ctx.force) {
    return { response: legacyResponse, precision: null };
  }

  const modules = deliverModules(user, {
    visible_modules: legacyResponse.visible_modules,
    functional_axis: legacyResponse.functional_axis || legacyResponse.functional_area,
    ...ctx
  });

  let widgets = legacyResponse.engine_v2?.payload?.layout?.widgets;
  let cardBlock = null;
  if (widgets) {
    cardBlock = applyCardPrecision(widgets, user, {
      functional_axis: legacyResponse.functional_axis,
      domain: legacyResponse.functional_area
    });
  }

  const contextual = governContextualDelivery(user, legacyResponse, ctx);
  const validation = validatePrecisionRuntime(
    { visible_modules: legacyResponse.visible_modules },
    modules,
    { shadow_mode: modules.shadow_only }
  );

  const explanations = (modules.precision_detail?.ineligible || []).map((i) =>
    explainModule(i.module_id, false, i.reason, i.module_delivery_confidence)
  );

  recordDeliverySample({
    delivery_precision_score: validation.delivery_precision_score,
    module_delivery_accuracy: modules.module_delivery_confidence,
    widget_delivery_accuracy: cardBlock?.card_precision?.widget_delivery_accuracy,
    overdelivery: validation.comparison.overdelivery.length > 0,
    underdelivery: validation.comparison.underdelivery.length > 0
  });

  const precision_block = {
    phase: 'L',
    shadow_only: modules.shadow_only && !(cardBlock?.exactness?.enforcement_active),
    observability: phaseL.isRuntimePrecisionObservabilityEnabled(),
    flags: {
      module_delivery: phaseL.isPreciseModuleDeliveryEnabled(),
      tool_exposure: phaseL.isPreciseToolExposureEnabled(),
      widget_governance: phaseL.isPreciseWidgetGovernanceEnabled(),
      kpi_alignment: phaseL.isPreciseKpiAlignmentEnabled(),
      summary_engine: phaseL.isPreciseSummaryEngineEnabled()
    },
    modules: {
      module_delivery_confidence: modules.module_delivery_confidence,
      contextual_precision_score: modules.contextual_precision_score,
      overdelivery_candidates: modules.precision_detail?.overdelivery_candidates,
      underdelivery_risk: modules.precision_detail?.underdelivery_risk,
      precise_modules: modules.precise_modules,
      shadow_comparison: validation.comparison
    },
    cards: cardBlock?.card_precision || null,
    contextual: {
      governance_delivery_confidence: contextual.governance_delivery_confidence,
      runtime_contextual_integrity: contextual.runtime_contextual_integrity,
      contextual_precision_score: contextual.contextual_target?.contextual_precision_score,
      semantic_precision_score: contextual.contextual_target?.semantic_precision_score
    },
    validation: {
      delivery_precision_score: validation.delivery_precision_score,
      issues: validation.issues
    },
    explainability: buildDeliveryExplainabilityReport({ modules: explanations })
  };

  const response = { ...legacyResponse };
  if (modules.enforcement_active) {
    response.visible_modules = modules.visible_modules;
  }

  return { response, precision: precision_block };
}

function enrichKpiPrecision(user, kpiPayload, ctx = {}) {
  if (!isPrecisionLayerActive() && !ctx.force) return { payload: kpiPayload, precision: null };
  const resolved = resolvePreciseKpis(kpiPayload, user, ctx);
  return {
    payload: resolved.shadow_only ? kpiPayload : resolved.kpi_payload,
    precision: {
      kpi_delivery_confidence: resolved.kpi_delivery_confidence,
      states: resolved.states,
      shadow_only: resolved.shadow_only,
      enforcement_active: resolved.enforcement_active
    }
  };
}

function enrichSummaryPrecision(user, summary, ctx = {}) {
  if (!isPrecisionLayerActive() && !ctx.force) return { summary, precision: null };
  const resolved = resolvePreciseSummary(summary, user, ctx);
  return {
    summary: resolved.shadow_only ? summary : resolved.summary,
    precision: {
      summary_delivery_confidence: resolved.summary_delivery_confidence,
      precision: resolved.precision,
      shadow_only: resolved.shadow_only
    }
  };
}

function getPrecisionReport() {
  return {
    telemetry: getDeliveryTelemetry(),
    audit_trail: listPrecisionAudit(30),
    flags: {
      IMPETUS_PRECISE_MODULE_DELIVERY: phaseL.isPreciseModuleDeliveryEnabled(),
      IMPETUS_PRECISE_TOOL_EXPOSURE: phaseL.isPreciseToolExposureEnabled(),
      IMPETUS_PRECISE_WIDGET_GOVERNANCE: phaseL.isPreciseWidgetGovernanceEnabled(),
      IMPETUS_PRECISE_KPI_ALIGNMENT: phaseL.isPreciseKpiAlignmentEnabled(),
      IMPETUS_PRECISE_SUMMARY_ENGINE: phaseL.isPreciseSummaryEngineEnabled(),
      IMPETUS_RUNTIME_PRECISION_OBSERVABILITY: phaseL.isRuntimePrecisionObservabilityEnabled()
    }
  };
}

function resolveToolsForUser(user, tools, ctx = {}) {
  return computeToolVisibility(tools, user, ctx);
}

function resolveWidgetsForUser(user, widgets, ctx = {}) {
  return applyCardPrecision(widgets, user, ctx);
}

module.exports = {
  isPrecisionLayerActive,
  enrichDashboardMePrecision,
  enrichKpiPrecision,
  enrichSummaryPrecision,
  getPrecisionReport,
  resolveToolsForUser,
  resolveWidgetsForUser,
  deliverModules,
  validatePrecisionRuntime
};
