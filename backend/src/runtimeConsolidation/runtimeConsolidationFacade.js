'use strict';

const flags = require('./config/runtimeConsolidationFeatureFlags');
const { analyzeRuntimeConsolidation } = require('./runtimeConsolidationAnalyzer');
const { analyzeLegacyResolvers } = require('./legacyResolverAnalysis');
const { adviseRuntimeSimplification } = require('./runtimeSimplificationAdvisor');
const { buildPipelineDependencyGraph } = require('./pipelineDependencyGraph');
const { getConsolidationTelemetry } = require('./runtimeConsolidationTelemetry');

function isRuntimeConsolidationLayerActive() {
  return (
    flags.isRuntimeConsolidationObservabilityEnabled() ||
    flags.isRuntimeConsolidationEnabled() ||
    flags.isLegacyReductionAnalysisEnabled()
  );
}

function getRuntimeConsolidationStatus(ctx = {}) {
  return {
    layer: 'runtime-consolidation',
    observability: flags.isRuntimeConsolidationObservabilityEnabled(),
    consolidation: flags.isRuntimeConsolidationEnabled(),
    legacy_analysis: flags.isLegacyReductionAnalysisEnabled(),
    recommendation_only: true,
    auto_remove: false,
    rollback_safe: true,
    tenant_id: ctx.tenant_id,
    telemetry: getConsolidationTelemetry()
  };
}

function getRuntimeConsolidationReport(ctx = {}) {
  const analysis = analyzeRuntimeConsolidation(ctx);
  const legacy = analyzeLegacyResolvers(ctx);
  const graph = buildPipelineDependencyGraph({ ...ctx, force_graph: true });
  const recommendations = adviseRuntimeSimplification(analysis, graph, legacy, ctx);

  return {
    ok: true,
    status: getRuntimeConsolidationStatus(ctx),
    analysis,
    legacy,
    dependencies: graph,
    recommendations,
    telemetry: getConsolidationTelemetry(),
    auto_remove: false,
    legacy_pipelines_preserved: true
  };
}

module.exports = {
  isRuntimeConsolidationLayerActive,
  getRuntimeConsolidationStatus,
  getRuntimeConsolidationReport,
  analyzeRuntimeConsolidation,
  analyzeLegacyResolvers,
  adviseRuntimeSimplification,
  buildPipelineDependencyGraph
};
