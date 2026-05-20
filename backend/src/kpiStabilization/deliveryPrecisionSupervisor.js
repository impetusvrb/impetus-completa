'use strict';

const phaseU = require('./config/phaseUFeatureFlags');
const { recordStabilizationSample } = require('./kpiStabilizationTelemetry');
const { superviseRuntimePrecision } = require('./runtimePrecisionSupervisor');
const { superviseHierarchyIntegrity } = require('./hierarchyIntegritySupervisor');
const { alignKpiSemantics } = require('./kpiSemanticAlignmentEngine');

function superviseDeliveryPrecision(user, kpiPayload, ctx = {}) {
  const runtime = superviseRuntimePrecision(user, kpiPayload, ctx);
  const hierarchy = superviseHierarchyIntegrity(user, kpiPayload, ctx);
  const semantic = alignKpiSemantics(user, kpiPayload, ctx);

  const delivery_precision_score = Number(
    (
      (runtime.delivery_precision_score +
        hierarchy.hierarchy_integrity_score +
        semantic.KPI_semantic_relevance) /
      3
    ).toFixed(4)
  );

  recordStabilizationSample({
    delivery_precision_score,
    contextual_alignment_score: runtime.contextual_alignment_score,
    hierarchy_integrity_score: hierarchy.hierarchy_integrity_score,
    semantic_relevance_score: semantic.KPI_semantic_relevance,
    operational_delivery_accuracy: runtime.operational_delivery_accuracy
  });

  return {
    delivery_precision_score,
    contextual_alignment_score: runtime.contextual_alignment_score,
    hierarchy_integrity_score: hierarchy.hierarchy_integrity_score,
    semantic_relevance_score: semantic.KPI_semantic_relevance,
    operational_delivery_accuracy: runtime.operational_delivery_accuracy,
    runtime,
    hierarchy,
    semantic,
    enforcement_active: phaseU.isKpiDeliveryPrecisionSupervisionEnabled(),
    auto_correct: false
  };
}

module.exports = { superviseDeliveryPrecision };
