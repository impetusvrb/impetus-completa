'use strict';

const CHAIN_TEMPLATES = [
  {
    id: 'maint_stop_delay_nc',
    chain: ['maintenance', 'downtime', 'delay', 'nc'],
    hypothesis: 'manutenção → parada → atraso → NC'
  },
  {
    id: 'setup_queue_throughput',
    chain: ['setup', 'queue', 'throughput'],
    hypothesis: 'setup alto → fila → throughput ↓'
  },
  {
    id: 'rework_waste_efficiency',
    chain: ['rework', 'waste', 'efficiency'],
    hypothesis: 'retrabalho → desperdício → eficiência ↓'
  },
  {
    id: 'production_accel_nc',
    chain: ['production', 'throughput', 'quality', 'nc'],
    hypothesis: 'produção acelerada → pressão → NC ↑'
  },
  {
    id: 'comm_delay_bottleneck',
    chain: ['delay', 'queue', 'throughput'],
    hypothesis: 'falha comunicação/atraso → gargalo'
  }
];

function resolveCrossDomainCausality(graph = {}, events = []) {
  const nodes = graph.nodes || [];
  const byType = Object.fromEntries(nodes.map((n) => [n.node_type, n]));
  const chains = [];

  for (const tpl of CHAIN_TEMPLATES) {
    const strengths = tpl.chain.map((t) => byType[t]?.operational_weight ?? 0);
    const confidences = tpl.chain.map((t) => byType[t]?.confidence_score ?? 0);
    const causal_strength = strengths.length
      ? Number((strengths.reduce((a, b) => a + b, 0) / strengths.length).toFixed(3))
      : 0;
    const evidence = events.filter((e) =>
      tpl.chain.some((step) => (e.operational_context || '').toLowerCase().includes(step.slice(0, 4)))
    ).length;

    if (causal_strength < 0.25) continue;

    chains.push({
      causal_chain: tpl.chain,
      causal_strength,
      recurrence_factor: Number(Math.min(1, evidence / 3).toFixed(3)),
      operational_impact: Number((causal_strength * (1 + evidence * 0.1)).toFixed(3)),
      evidence_density: evidence,
      chain_id: tpl.id,
      hypothesis: tpl.hypothesis
    });
  }

  return {
    chains: chains.sort((a, b) => b.operational_impact - a.operational_impact),
    strongest_chain: chains[0] || null,
    auto_decisions: false
  };
}

module.exports = { resolveCrossDomainCausality, CHAIN_TEMPLATES };
