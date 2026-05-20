'use strict';

const phaseU = require('./config/phaseUFeatureFlags');
const { correctRuntimeDelivery } = require('./runtimeDeliveryCorrectionEngine');
const { superviseDeliveryPrecision } = require('./deliveryPrecisionSupervisor');
const { alignKpiSemantics } = require('./kpiSemanticAlignmentEngine');
const { stabilizeHierarchyDelivery } = require('./hierarchyDeliveryStabilizer');
const { superviseKpiLeakage } = require('./leakageSupervisor');
const { superviseKpiUnderdelivery } = require('./underdeliverySupervisor');
const { getStabilizationTelemetry } = require('./kpiStabilizationTelemetry');

function isKpiStabilizationLayerActive() {
  return (
    phaseU.isKpiStabilizationObservabilityEnabled() ||
    phaseU.isKpiRuntimeStabilizationEnabled() ||
    phaseU.isKpiSemanticAlignmentEnabled()
  );
}

function getKpiStabilizationStatus(ctx = {}) {
  return {
    phase: 'U',
    observability: phaseU.isKpiStabilizationObservabilityEnabled(),
    runtime_stabilization: phaseU.isKpiRuntimeStabilizationEnabled(),
    semantic_alignment: phaseU.isKpiSemanticAlignmentEnabled(),
    hierarchy_stabilization: phaseU.isKpiHierarchyStabilizationEnabled(),
    delivery_precision_supervision: phaseU.isKpiDeliveryPrecisionSupervisionEnabled(),
    global_auto_correction: false,
    telemetry: getStabilizationTelemetry(),
    tenant_id: ctx.tenant_id
  };
}

function enrichKpiRuntimeStabilization(user, kpiPayload, ctx = {}) {
  if (!isKpiStabilizationLayerActive() && !ctx.force) {
    return {
      payload: kpiPayload,
      kpi_runtime_stabilization: null,
      delivery_precision: null,
      kpi_semantic_alignment: null,
      hierarchy_delivery_integrity: null
    };
  }

  const mergedCtx = {
    ...ctx,
    functional_axis: ctx.functional_axis || user?.functional_axis || user?.functional_area,
    tenant_id: user?.company_id
  };

  const correction = correctRuntimeDelivery(user, kpiPayload, mergedCtx);
  const precision = superviseDeliveryPrecision(user, kpiPayload, mergedCtx);
  const semantic = alignKpiSemantics(user, kpiPayload, mergedCtx);
  const hierarchy = stabilizeHierarchyDelivery(user, kpiPayload, mergedCtx);
  const leakage = superviseKpiLeakage(user, kpiPayload, mergedCtx);
  const underdelivery = superviseKpiUnderdelivery(user, kpiPayload, mergedCtx);

  const kpi_runtime_stabilization = {
    phase: 'U',
    shadow_only: !phaseU.isKpiRuntimeStabilizationEnabled(),
    observability: phaseU.isKpiStabilizationObservabilityEnabled(),
    status: getKpiStabilizationStatus(mergedCtx),
    stable: correction.stable,
    correction_summary: {
      issue_count: correction.corrections?.length || 0,
      recommendation_count: correction.recommendations?.length || 0
    },
    leakage: { detected: leakage.leakage_detected, count: leakage.leakage_count },
    underdelivery: { detected: underdelivery.underdelivery, gap: underdelivery.gap },
    auto_correct: false,
    supervised: true
  };

  const delivery_precision = {
    delivery_precision_score: precision.delivery_precision_score,
    contextual_alignment_score: precision.contextual_alignment_score,
    hierarchy_integrity_score: precision.hierarchy_integrity_score,
    semantic_relevance_score: precision.semantic_relevance_score,
    operational_delivery_accuracy: precision.operational_delivery_accuracy,
    recommendations: correction.recommendations,
    auto_correct: false
  };

  const kpi_semantic_alignment = {
    KPI_semantic_relevance: semantic.KPI_semantic_relevance,
    KPI_operational_usefulness: semantic.KPI_operational_usefulness,
    KPI_hierarchy_coherence: semantic.KPI_hierarchy_coherence,
    KPI_contextual_alignment: semantic.KPI_contextual_alignment,
    corrections: semantic.corrections,
    recommendations: semantic.recommendations,
    auto_correct: false
  };

  const hierarchy_delivery_integrity = {
    hierarchy_delivery_integrity: hierarchy.hierarchy_delivery_integrity,
    stable: hierarchy.stable,
    operational_hierarchy: hierarchy.operational_hierarchy,
    stabilization_actions: hierarchy.stabilization_actions,
    recommendations: hierarchy.recommendations,
    auto_correct: false
  };

  return {
    payload: kpiPayload,
    kpi_runtime_stabilization,
    delivery_precision,
    kpi_semantic_alignment,
    hierarchy_delivery_integrity,
    correction,
    precision
  };
}

module.exports = {
  isKpiStabilizationLayerActive,
  getKpiStabilizationStatus,
  enrichKpiRuntimeStabilization,
  correctRuntimeDelivery,
  superviseDeliveryPrecision,
  alignKpiSemantics,
  stabilizeHierarchyDelivery
};
