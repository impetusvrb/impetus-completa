'use strict';

const phaseO = require('./config/phaseOFeatureFlags');
const { runStabilization } = require('./enterpriseRuntimeStabilizationEngine');
const { detectGovernanceFatigue } = require('./governanceFatigueDetector');
const { detectOvergovernance } = require('./runtimeOvergovernanceDetector');
const { detectObservabilitySaturation } = require('./observabilitySaturationDetector');
const { analyzePipelineRedundancy } = require('./pipelineRedundancyAnalyzer');
const { recommendDeduplication } = require('./cognitivePipelineDeduplicator');
const { detectLegacyOverlap } = require('./legacyPipelineOverlapDetector');
const { computeRuntimeEfficiency } = require('./runtimeEfficiencyEngine');
const { trackOverhead } = require('./cognitiveOverheadTracker');
const { analyzeOrchestrationEfficiency } = require('./orchestrationEfficiencyAnalyzer');
const { analyzeShadowOptimization } = require('./shadowOptimizationEngine');
const { detectShadowRedundancy } = require('./shadowRedundancyDetector');
const { analyzeLayerOverlap } = require('./runtimeLayerOverlapAnalyzer');
const { adviseLayerConsolidation } = require('./governanceLayerConsolidationAdvisor');
const { evaluateRuntimeMaturity } = require('./runtimeMaturityEvaluator');
const { evaluateGovernanceMaturity } = require('./enterpriseGovernanceMaturity');
const { evaluateOperationalCognitiveMaturity } = require('./operationalCognitiveMaturity');
const { recordStabilizationSample, getStabilizationTelemetry } = require('./stabilizationTelemetry');

function isStabilizationLayerActive() {
  return (
    phaseO.isRuntimeStabilizationObservabilityEnabled() ||
    phaseO.isRuntimeStabilizationEnabled() ||
    phaseO.isGovernanceFatigueDetectionEnabled() ||
    phaseO.isPipelineRedundancyAnalysisEnabled() ||
    phaseO.isRuntimeEfficiencyEngineEnabled() ||
    phaseO.isShadowOptimizationEnabled()
  );
}

function countObservabilityBlocks(ctx = {}) {
  return [
    ctx.semantic_alignment,
    ctx.precision_delivery,
    ctx.cognitive_convergence,
    ctx.enterprise_cognitive_operations,
    ctx.content_exposure
  ].filter(Boolean).length;
}

function buildActiveBlocks(ctx = {}) {
  return {
    semantic_alignment: Boolean(ctx.semantic_alignment),
    precision_delivery: Boolean(ctx.precision_delivery),
    cognitive_convergence: Boolean(ctx.cognitive_convergence),
    enterprise_cognitive_operations: Boolean(ctx.enterprise_cognitive_operations),
    contextual_modules: Boolean(ctx.contextual_modules),
    smart_summary_enricher: Boolean(ctx.has_legacy_summary)
  };
}

function enrichWithRuntimeStabilization(user, legacyResponse, ctx = {}) {
  if (!isStabilizationLayerActive() && !ctx.force) {
    return { response: legacyResponse, stabilization: null };
  }

  const activeBlocks = buildActiveBlocks(ctx);
  const observabilityBlocks = countObservabilityBlocks(ctx);
  const activeLayers = Object.values(activeBlocks).filter(Boolean).length;

  const ops = ctx.enterprise_cognitive_operations || {};
  const signals = {
    active_layers: activeLayers,
    observability_blocks: observabilityBlocks,
    cognitive_operational_pressure: ops.telemetry_snapshot?.cognitive_operational_pressure ?? 0.25,
    runtime_entropy_score: ops.entropy?.runtime_entropy_score ?? 0.12,
    runtime_stability: ops.stability?.runtime_stability ?? 0.88,
    cognitive_runtime_health: ops.health?.cognitive_runtime_health ?? 0.87,
    governance_effectiveness_score: ops.governance_self_observation?.self_evaluation?.governance_effectiveness_score ?? 0.84,
    runtime_resilience: ops.telemetry_snapshot?.runtime_resilience ?? 0.88,
    shadow_layers: observabilityBlocks
  };

  const stabilization = runStabilization(ctx);
  const fatigue = detectGovernanceFatigue(signals);
  const overgov = detectOvergovernance({ ...signals, validator_count: activeLayers + 2 });
  const obsSat = detectObservabilitySaturation(signals);
  const redundancy = analyzePipelineRedundancy(activeBlocks);
  const dedup = recommendDeduplication(redundancy);
  const legacyOverlap = detectLegacyOverlap({
    has_legacy_summary: ctx.has_legacy_summary,
    has_contextual_modules: Boolean(ctx.contextual_modules),
    has_legacy_kpi: ctx.has_legacy_kpi
  });
  const efficiency = computeRuntimeEfficiency(signals);
  trackOverhead({ cognitive_overhead: efficiency.cognitive_overhead });
  const orchestration = analyzeOrchestrationEfficiency({ active_layers: activeLayers, pipeline_hops: activeLayers + 2 });
  const shadowBlocks = {
    semantic_alignment: ctx.semantic_alignment,
    precision_delivery: ctx.precision_delivery,
    cognitive_convergence: ctx.cognitive_convergence,
    enterprise_cognitive_operations: ctx.enterprise_cognitive_operations
  };
  const shadowRedundancy = detectShadowRedundancy(shadowBlocks);
  const shadowOpt = analyzeShadowOptimization({
    shadow_layers: shadowRedundancy.shadow_block_count,
    shadow_duplication: shadowRedundancy.redundant_shadow
  });
  const layerOverlap = analyzeLayerOverlap(activeBlocks);
  const consolidation = adviseLayerConsolidation({ ...layerOverlap, layer_count: activeLayers });

  const runtimeMaturity = evaluateRuntimeMaturity({ ...signals, runtime_efficiency: efficiency.runtime_efficiency });
  const govMaturity = evaluateGovernanceMaturity({ ...signals, governance_fatigue: fatigue.governance_fatigue });
  const opMaturity = evaluateOperationalCognitiveMaturity(signals);

  const stabilization_score = Number(
    ((runtimeMaturity.runtime_maturity + govMaturity.governance_maturity + opMaturity.operational_cognitive_maturity) / 3).toFixed(4)
  );

  recordStabilizationSample({
    stabilization_score,
    runtime_simplicity_score: efficiency.runtime_efficiency,
    governance_efficiency: govMaturity.governance_maturity,
    orchestration_efficiency: orchestration.orchestration_efficiency,
    cognitive_runtime_pressure: signals.cognitive_operational_pressure,
    observability_pressure: obsSat.observability_pressure,
    runtime_sustainability: opMaturity.sustainability_score
  });

  const stabilization_block = {
    phase: 'O',
    shadow_only: !phaseO.isRuntimeStabilizationEnabled(),
    observability: phaseO.isRuntimeStabilizationObservabilityEnabled(),
    flags: {
      runtime_stabilization: phaseO.isRuntimeStabilizationEnabled(),
      governance_fatigue: phaseO.isGovernanceFatigueDetectionEnabled(),
      pipeline_redundancy: phaseO.isPipelineRedundancyAnalysisEnabled(),
      runtime_efficiency: phaseO.isRuntimeEfficiencyEngineEnabled(),
      shadow_optimization: phaseO.isShadowOptimizationEnabled()
    },
    stabilization_score,
    fatigue,
    overgovernance: overgov,
    observability_saturation: obsSat,
    redundancy: { ...redundancy, recommendations: dedup },
    legacy_overlap: legacyOverlap,
    efficiency,
    orchestration,
    shadow: { ...shadowOpt, redundancy: shadowRedundancy },
    consolidation,
    maturity: {
      runtime: runtimeMaturity,
      governance: govMaturity,
      operational_cognitive: opMaturity
    },
    supervision: stabilization,
    telemetry_snapshot: getStabilizationTelemetry(),
    auto_simplify: false,
    auto_consolidate: false,
    auto_remediate: false
  };

  return { response: legacyResponse, stabilization: stabilization_block };
}

function getStabilizationReport() {
  return {
    telemetry: getStabilizationTelemetry(),
    flags: {
      IMPETUS_RUNTIME_STABILIZATION: phaseO.isRuntimeStabilizationEnabled(),
      IMPETUS_GOVERNANCE_FATIGUE_DETECTION: phaseO.isGovernanceFatigueDetectionEnabled(),
      IMPETUS_PIPELINE_REDUNDANCY_ANALYSIS: phaseO.isPipelineRedundancyAnalysisEnabled(),
      IMPETUS_RUNTIME_EFFICIENCY_ENGINE: phaseO.isRuntimeEfficiencyEngineEnabled(),
      IMPETUS_SHADOW_OPTIMIZATION: phaseO.isShadowOptimizationEnabled(),
      IMPETUS_RUNTIME_STABILIZATION_OBSERVABILITY: phaseO.isRuntimeStabilizationObservabilityEnabled()
    },
    shadow_first: true,
    enforcement_default: false
  };
}

module.exports = {
  isStabilizationLayerActive,
  enrichWithRuntimeStabilization,
  getStabilizationReport,
  buildActiveBlocks,
  runStabilization
};
