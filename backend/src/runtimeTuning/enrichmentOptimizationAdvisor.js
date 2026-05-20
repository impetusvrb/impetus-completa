'use strict';

const flags = require('./config/runtimeTuningFeatureFlags');
const { logRuntimeTuning } = require('./runtimeTuningLogger');

function adviseEnrichmentOptimization(ctx = {}) {
  const issues = { stale: [], orphan: [], weak: [], duplicated: [] };

  if (ctx.telemetry_integrity?.gaps_detected) {
    for (const g of ctx.telemetry_integrity.gaps || []) {
      issues.stale.push({ source: g.source || 'telemetry', severity: g.severity || 'medium' });
    }
  }
  if (ctx.runtime_enrichment?.low_density) {
    issues.weak.push({ type: 'low_operational_density' });
  }
  if (ctx.enrichment_integrity?.enrichment_integrity_score < 0.6) {
    issues.weak.push({ score: ctx.enrichment_integrity.enrichment_integrity_score });
  }
  if (ctx.operational_signal_quality?.issues?.length > 8) {
    issues.orphan.push({ count: ctx.operational_signal_quality.issues.length, type: 'signal_noise' });
  }

  const pipelineBlocks = [
    'runtime_enrichment',
    'semantic_enrichment',
    'precision_delivery',
    'contextual_delivery'
  ].filter((k) => ctx[k] != null);
  if (pipelineBlocks.length >= 3 && ctx.runtime_enrichment?.consolidated_signals?.duplicate_risk) {
    issues.duplicated.push({ pipelines: pipelineBlocks });
  }
  if (pipelineBlocks.length >= 4) {
    issues.duplicated.push({ pipelines: pipelineBlocks, note: 'shadow_overlap' });
  }

  const total =
    issues.stale.length + issues.orphan.length + issues.weak.length + issues.duplicated.length;

  if (total >= 1 && flags.isRuntimeTuningObservabilityEnabled()) {
    logRuntimeTuning('ENRICHMENT_OPTIMIZATION_REQUIRED', { total, tenant_id: ctx.tenant_id, shadow_only: true });
  }
  if (issues.stale.length && flags.isRuntimeTuningObservabilityEnabled()) {
    logRuntimeTuning('STALE_ENRICHER_DETECTED', { count: issues.stale.length, shadow_only: true });
  }

  const recommendations = [];
  if (issues.stale.length) {
    recommendations.push('Refrescar conectores e validar freshness de enrichers industriais');
  }
  if (issues.orphan.length) {
    recommendations.push('Remover ou consolidar sinais órfãos (supervisão humana)');
  }
  if (issues.weak.length) {
    recommendations.push('Reforçar densidade operacional antes de promover enforcement');
  }
  if (issues.duplicated.length) {
    recommendations.push('Revisar pipelineConsolidationAdvisor — enrichers sobrepostos');
  }

  return {
    enrichment_issues: issues,
    enrichment_recommendations: recommendations,
    stale_enrichers: issues.stale,
    orphan_enrichers: issues.orphan,
    weak_enrichers: issues.weak,
    duplicated_enrichers: issues.duplicated,
    issue_total: total,
    auto_apply: false
  };
}

module.exports = { adviseEnrichmentOptimization };
