'use strict';

const NODES = [
  { id: 'dashboard_me', type: 'composer', alters: true, consumes: ['user'] },
  { id: 'content_exposure', type: 'resolver', alters: true, consumes: ['user', 'policy'] },
  { id: 'semantic_alignment', type: 'governor', alters: true, consumes: ['modules'] },
  { id: 'precision_delivery', type: 'governor', alters: false, consumes: ['modules', 'semantic'] },
  { id: 'unified_cognitive_context', type: 'converger', alters: false, consumes: ['semantic', 'precision', 'exposure'] },
  { id: 'smart_summary', type: 'enricher', alters: true, consumes: ['kpis', 'context'] },
  { id: 'dashboard_kpis', type: 'channel', alters: false, consumes: ['scope'] },
  { id: 'cognitive_governance', type: 'governor', alters: true, consumes: ['channel_payload'] }
];

function buildCompositionGraph(ctx = {}) {
  const edges = [];
  for (let i = 0; i < NODES.length - 1; i++) {
    edges.push({ from: NODES[i].id, to: NODES[i + 1].id, type: 'sequential_shadow' });
  }
  const redundant = NODES.filter((n) => n.type === 'enricher' && n.alters);
  return {
    nodes: NODES,
    edges,
    redundant_builders: redundant.map((n) => n.id),
    loop_risk: false,
    tenant_id: ctx.tenant_id || null
  };
}

module.exports = { buildCompositionGraph, NODES };
