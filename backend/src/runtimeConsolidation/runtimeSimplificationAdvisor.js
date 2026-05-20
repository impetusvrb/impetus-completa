'use strict';

const flags = require('./config/runtimeConsolidationFeatureFlags');
const { logRuntimeConsolidation } = require('./runtimeConsolidationLogger');
const { recordConsolidationAnalysis } = require('./runtimeConsolidationTelemetry');

function adviseRuntimeSimplification(analysis = {}, graph = {}, legacy = {}, ctx = {}) {
  const recommendations = [];

  for (const o of analysis.overlaps || []) {
    recommendations.push({
      type: 'consolidation',
      priority: o.severity === 'medium' ? 'high' : 'low',
      message: `Documentar fronteira entre fases ${o.phases.join('/')} (${o.type}); não remover em produção`,
      pipelines: o.pipelines
    });
  }

  for (const c of graph.consolidation_graph?.candidates || []) {
    recommendations.push({
      type: 'consolidation',
      priority: c.risk === 'medium' ? 'medium' : 'low',
      message: `Candidato gradual: ${c.nodes.join(' + ')} — acção: ${c.action}`,
      rollback_safe: true
    });
  }

  for (const l of legacy.legacy_heuristics || []) {
    recommendations.push({
      type: 'legacy_reduction',
      priority: 'low',
      message: `Legacy block ${l.block}: ${l.note}`,
      auto_remove: false
    });
  }

  if (analysis.shadow_duplication?.length) {
    recommendations.push({
      type: 'overhead_reduction',
      priority: 'medium',
      message: 'Reduzir camadas shadow activas simultâneas; promover por tenant (Phase TR)',
      auto_remove: false
    });
  }

  if (ctx.runtime_tuning?.efficiency?.efficiency_score < 0.65) {
    recommendations.push({
      type: 'simplification',
      priority: 'high',
      message: 'Priorizar simplificação antes de novos enrichers (ver runtime-tuning/report)',
      auto_remove: false
    });
  }

  if (recommendations.length && flags.isRuntimeConsolidationObservabilityEnabled()) {
    logRuntimeConsolidation('RUNTIME_CONSOLIDATION_RECOMMENDED', {
      count: recommendations.length,
      tenant_id: ctx.tenant_id,
      shadow_only: true
    });
  }

  recordConsolidationAnalysis({ recommendations: recommendations.length });

  return {
    simplification_recommendations: recommendations,
    consolidation_recommendations: recommendations.filter((r) => r.type === 'consolidation'),
    overhead_reduction: recommendations.filter((r) => r.type === 'overhead_reduction'),
    recommendation_only: true,
    auto_remove: false,
    auto_apply: false,
    rollback_safe: true,
    human_supervision_required: true
  };
}

module.exports = { adviseRuntimeSimplification };
