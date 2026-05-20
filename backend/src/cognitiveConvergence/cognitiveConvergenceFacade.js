'use strict';

const phaseM = require('./config/phaseMFeatureFlags');
const { buildUnifiedCognitiveContext } = require('./unifiedCognitiveContextEngine');
const { resolveKpiTruth } = require('./unifiedKpiTruthResolver');
const { resolveSummaryTruth } = require('./unifiedSummaryTruthResolver');
const { resolveInsightTruth } = require('./unifiedInsightResolver');
const { validateCognitiveConsistency } = require('./cognitiveConsistencyValidator');
const { validateConvergenceIntegrity } = require('./convergenceIntegrityValidator');
const { detectContextDrift } = require('./contextDriftDetector');
const { detectFragmentation } = require('./runtimeTruthDeviationDetector');
const { buildCompositionGraph } = require('./contextCompositionGraph');
const { buildCognitiveDependencyGraph } = require('./cognitiveDependencyGraph');
const { resolveUnifiedExplainability } = require('./unifiedExplainabilityResolver');
const { recordConvergenceSample, getConvergenceTelemetry } = require('./cognitiveConvergenceTelemetry');
const { getRuntimeTruthState } = require('./runtimeTruthState');
const { trackSemanticDrift } = require('./semanticDriftTracker');

let _lastTruthSnapshot = null;

function isConvergenceLayerActive() {
  return (
    phaseM.isCognitiveConvergenceObservabilityEnabled() ||
    phaseM.isUnifiedCognitiveContextEnabled() ||
    phaseM.isRuntimeTruthAuthorityEnabled() ||
    phaseM.isGovernedAiOrchestrationEnabled() ||
    phaseM.isCognitiveConsistencyValidationEnabled() ||
    phaseM.isContextDriftDetectionEnabled()
  );
}

function enrichWithCognitiveConvergence(user, legacyResponse, ctx = {}) {
  if (!isConvergenceLayerActive() && !ctx.force) {
    return { response: legacyResponse, convergence: null };
  }

  const unified = buildUnifiedCognitiveContext(user, {
    visible_modules: legacyResponse.visible_modules,
    functional_axis: legacyResponse.functional_axis || legacyResponse.functional_area,
    semantic_alignment: ctx.semantic_alignment,
    precision_delivery: ctx.precision_delivery,
    content_exposure: ctx.content_exposure,
    force_observe: true
  });

  const graph = buildCompositionGraph({ tenant_id: user?.company_id });
  const fragmentation = detectFragmentation(graph);
  const drift = detectContextDrift(_lastTruthSnapshot, unified.runtime_truth_state);
  _lastTruthSnapshot = unified.runtime_truth_state;
  trackSemanticDrift({ axis: unified.runtime_truth_state?.authority?.contextual_truth?.functional_axis });

  const consistency = validateCognitiveConsistency({
    runtime_axis: unified.runtime_truth_state?.authority?.contextual_truth?.functional_axis,
    widget_domain: ctx.widget_domain
  });

  const telemetry = getConvergenceTelemetry();
  const integrity = validateConvergenceIntegrity({
    ...telemetry,
    cognitive_fragmentation_rate: fragmentation.cognitive_fragmentation_rate
  });

  recordConvergenceSample({
    convergence_rate: integrity.semantic_convergence_rate,
    truth_integrity: integrity.runtime_truth_integrity,
    contextual_unification_score: unified.runtime_truth_state?.contextual_unification_score,
    runtime_truth_confidence: unified.runtime_truth_state?.runtime_truth_confidence
  });

  const explainability = resolveUnifiedExplainability({
    runtime_truth_state: unified.runtime_truth_state
  });

  const convergence_block = {
    phase: 'M',
    shadow_only: unified.shadow_only && !phaseM.isUnifiedCognitiveContextEnabled(),
    observability: phaseM.isCognitiveConvergenceObservabilityEnabled(),
    flags: {
      unified_context: phaseM.isUnifiedCognitiveContextEnabled(),
      truth_authority: phaseM.isRuntimeTruthAuthorityEnabled(),
      ai_orchestration: phaseM.isGovernedAiOrchestrationEnabled(),
      consistency_validation: phaseM.isCognitiveConsistencyValidationEnabled(),
      drift_detection: phaseM.isContextDriftDetectionEnabled()
    },
    runtime_truth_state: unified.runtime_truth_state,
    cognitive_consistency_score: consistency.cognitive_consistency_score,
    runtime_truth_integrity: integrity.runtime_truth_integrity,
    convergence_confidence: integrity.convergence_confidence,
    semantic_convergence_rate: integrity.semantic_convergence_rate,
    drift,
    fragmentation,
    consistency,
    explainability,
    graph_summary: { nodes: graph.nodes.length, redundant: graph.redundant_builders }
  };

  const response = { ...legacyResponse };
  if (phaseM.isUnifiedCognitiveContextEnabled()) {
    response.runtime_truth_state = unified.runtime_truth_state;
  }

  return { response, convergence: convergence_block };
}

function enrichKpiConvergence(user, kpis, ctx = {}) {
  if (!isConvergenceLayerActive() && !ctx.force) return { kpis, convergence: null };
  const truth = resolveKpiTruth(kpis, user, ctx);
  const consistency = validateCognitiveConsistency({ kpi_truth: truth, runtime_axis: ctx.functional_axis });
  return {
    kpis: phaseM.isUnifiedCognitiveContextEnabled() ? truth.kpis : kpis,
    convergence: {
      kpi_truth: truth.kpi_truth,
      consistent: truth.consistent,
      cognitive_consistency_score: consistency.cognitive_consistency_score,
      shadow_only: !phaseM.isUnifiedCognitiveContextEnabled()
    }
  };
}

function enrichSummaryConvergence(user, summary, ctx = {}) {
  if (!isConvergenceLayerActive() && !ctx.force) return { summary, convergence: null };
  const truth = resolveSummaryTruth(summary, user, ctx);
  const consistency = validateCognitiveConsistency({ summary_truth: truth, kpi_truth: ctx.kpi_truth });
  return {
    summary: phaseM.isUnifiedCognitiveContextEnabled() ? truth.summary : summary,
    convergence: {
      summary_truth: truth.summary_truth,
      summary_consistency_rate: truth.summary_consistency_rate,
      consistent: truth.consistent,
      cognitive_consistency_score: consistency.cognitive_consistency_score,
      shadow_only: !phaseM.isUnifiedCognitiveContextEnabled()
    }
  };
}

function getConvergenceReport() {
  return {
    telemetry: getConvergenceTelemetry(),
    truth_state_sample: getRuntimeTruthState({ id: 'sample' }) || null,
    dependencies: buildCognitiveDependencyGraph(),
    semantic_graph: require('./runtimeSemanticGraph').buildSemanticGraph(),
    flags: {
      IMPETUS_UNIFIED_COGNITIVE_CONTEXT: phaseM.isUnifiedCognitiveContextEnabled(),
      IMPETUS_RUNTIME_TRUTH_AUTHORITY: phaseM.isRuntimeTruthAuthorityEnabled(),
      IMPETUS_GOVERNED_AI_ORCHESTRATION: phaseM.isGovernedAiOrchestrationEnabled(),
      IMPETUS_COGNITIVE_CONSISTENCY_VALIDATION: phaseM.isCognitiveConsistencyValidationEnabled(),
      IMPETUS_CONTEXT_DRIFT_DETECTION: phaseM.isContextDriftDetectionEnabled(),
      IMPETUS_COGNITIVE_CONVERGENCE_OBSERVABILITY: phaseM.isCognitiveConvergenceObservabilityEnabled()
    }
  };
}

module.exports = {
  isConvergenceLayerActive,
  enrichWithCognitiveConvergence,
  enrichKpiConvergence,
  enrichSummaryConvergence,
  getConvergenceReport,
  buildUnifiedCognitiveContext
};
