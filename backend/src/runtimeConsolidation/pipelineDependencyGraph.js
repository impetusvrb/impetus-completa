'use strict';

const flags = require('./config/runtimeConsolidationFeatureFlags');
const { logRuntimeConsolidation } = require('./runtimeConsolidationLogger');

const NODES = [
  { id: 'semantic_alignment', phase: 'E', deps: [] },
  { id: 'precision_delivery', phase: 'L', deps: ['semantic_alignment'] },
  { id: 'cognitive_convergence', phase: 'M', deps: ['precision_delivery'] },
  { id: 'enterprise_cognitive_operations', phase: 'N', deps: ['cognitive_convergence'] },
  { id: 'runtime_stabilization', phase: 'O', deps: ['enterprise_cognitive_operations'] },
  { id: 'contextual_delivery', phase: 'P', deps: ['runtime_stabilization'] },
  { id: 'runtime_consistency', phase: 'Q', deps: ['contextual_delivery'] },
  { id: 'decision_reliability', phase: 'R', deps: ['runtime_consistency'] },
  { id: 'controlled_activation', phase: 'S', deps: ['decision_reliability'] },
  { id: 'kpi_governance', phase: 'T', deps: ['controlled_activation'] },
  { id: 'kpi_runtime_stabilization', phase: 'U', deps: ['kpi_governance'] },
  { id: 'summary_governance', phase: 'V', deps: ['kpi_governance'] },
  { id: 'chat_alignment', phase: 'W', deps: ['summary_governance'] },
  { id: 'runtime_enrichment', phase: 'X', deps: ['runtime_consistency', 'kpi_governance'] },
  { id: 'runtime_calibration', phase: 'Y', deps: ['runtime_enrichment', 'controlled_activation'] },
  { id: 'runtime_tuning', phase: 'ZT', deps: ['runtime_calibration'] },
  { id: 'tenant_rollout', phase: 'TR', deps: ['controlled_activation', 'runtime_calibration'] }
];

function buildPipelineDependencyGraph(ctx = {}) {
  const present = NODES.filter((n) => ctx[n.id] != null);
  const presentIds = new Set(present.map((n) => n.id));

  const edges = [];
  for (const node of present) {
    for (const dep of node.deps) {
      if (presentIds.has(dep)) {
        edges.push({ from: dep, to: node.id, phase_from: NODES.find((x) => x.id === dep)?.phase, phase_to: node.phase });
      } else if (ctx.force_graph) {
        edges.push({ from: dep, to: node.id, missing_dependency: true });
      }
    }
  }

  const consolidation_candidates = [];
  if (presentIds.has('runtime_stabilization') && presentIds.has('kpi_runtime_stabilization')) {
    consolidation_candidates.push({
      nodes: ['runtime_stabilization', 'kpi_runtime_stabilization'],
      risk: 'low',
      action: 'merge_documentation_only'
    });
  }
  if (presentIds.has('runtime_enrichment') && presentIds.has('precision_delivery')) {
    consolidation_candidates.push({
      nodes: ['precision_delivery', 'runtime_enrichment'],
      risk: 'medium',
      action: 'evaluate_shared_enricher_facade'
    });
  }

  const risk_analysis = {
    removal_risk: consolidation_candidates.some((c) => c.risk === 'high') ? 'high' : 'low',
    shadow_depth: present.length,
    rollback_safe: true,
    auto_remove_forbidden: true
  };

  if (present.length > 10 && flags.isRuntimeConsolidationObservabilityEnabled()) {
    logRuntimeConsolidation('CONSOLIDATION_RISK_ELEVATED', {
      depth: present.length,
      candidates: consolidation_candidates.length,
      shadow_only: true
    });
  }

  return {
    dependency_graph: { nodes: present, edges },
    consolidation_graph: { candidates: consolidation_candidates },
    risk_analysis,
    node_count: present.length,
    edge_count: edges.length
  };
}

module.exports = { buildPipelineDependencyGraph, NODES };
