'use strict';

const NODE_TYPES = [
  'production',
  'maintenance',
  'quality',
  'setup',
  'queue',
  'waste',
  'downtime',
  'throughput',
  'oee',
  'delay',
  'nc',
  'rework',
  'efficiency',
  'capacity'
];

function _signal(payload, path, def = 0) {
  const parts = path.split('.');
  let cur = payload;
  for (const p of parts) {
    cur = cur?.[p];
    if (cur == null) return def;
  }
  return typeof cur === 'number' ? cur : def;
}

function buildProductionOperationalGraph(payload = {}, events = []) {
  const prod = payload.production_cognitive_runtime || {};
  const maint = payload.maintenance_cognitive_runtime || {};
  const qual = payload.quality_operational_metrics || {};
  const op = payload.production_contextual_questions?.length ? 0.7 : 0.4;

  const downtimeMin = maint.reliability?.downtime_minutes ?? _signal(payload, 'maintenance_cognitive_runtime.density') ?? 0;
  const ncOpen = qual.open_nc ?? qual.nc_open ?? (payload.quality_insights?.length || 0);
  const oeeProxy = prod.production_cognitive_health?.usefulness != null ? prod.production_cognitive_health.usefulness * 100 : 78;
  const queuePressure = events.filter((e) => /fila|queue|atraso/i.test(e.operational_context || '')).length;
  const wasteSignals = events.filter((e) => /desperd|scrap|retrabalho/i.test(e.operational_context || '')).length;

  const nodes = NODE_TYPES.map((node_type) => {
    let weight = 0.35;
    let confidence_score = 0.55;

    switch (node_type) {
      case 'production':
        weight = prod.consolidation_applied ? 0.85 : 0.4;
        confidence_score = prod.consolidation_applied ? 0.82 : 0.45;
        break;
      case 'maintenance':
        weight = maint.consolidation_applied ? 0.75 : 0.35;
        confidence_score = maint.consolidation_applied ? 0.8 : 0.4;
        break;
      case 'quality':
        weight = Math.min(1, 0.3 + ncOpen * 0.12);
        confidence_score = ncOpen > 0 ? 0.78 : 0.5;
        break;
      case 'downtime':
        weight = Math.min(1, downtimeMin / 120);
        confidence_score = downtimeMin > 0 ? 0.85 : 0.35;
        break;
      case 'oee':
        weight = oeeProxy / 100;
        confidence_score = 0.72;
        break;
      case 'throughput':
        weight = op;
        confidence_score = 0.68;
        break;
      case 'queue':
      case 'delay':
        weight = Math.min(1, queuePressure * 0.2 + 0.2);
        confidence_score = queuePressure > 0 ? 0.75 : 0.45;
        break;
      case 'waste':
      case 'rework':
        weight = Math.min(1, wasteSignals * 0.25 + 0.15);
        confidence_score = wasteSignals > 0 ? 0.7 : 0.4;
        break;
      case 'nc':
        weight = Math.min(1, ncOpen * 0.15);
        confidence_score = ncOpen > 0 ? 0.8 : 0.4;
        break;
      case 'efficiency':
        weight = oeeProxy / 100 * 0.9;
        confidence_score = 0.7;
        break;
      case 'setup':
        weight = 0.45;
        confidence_score = 0.5;
        break;
      case 'capacity':
        weight = 0.6;
        confidence_score = 0.55;
        break;
      default:
        break;
    }

    return {
      node_id: `node_${node_type}`,
      node_type,
      operational_weight: Number(weight.toFixed(3)),
      causal_links: [],
      downstream_impact: [],
      upstream_dependencies: [],
      confidence_score: Number(confidence_score.toFixed(3))
    };
  });

  const link = (from, to, strength) => {
    const a = nodes.find((n) => n.node_type === from);
    const b = nodes.find((n) => n.node_type === to);
    if (a && b) {
      a.causal_links.push({ to: b.node_id, strength });
      a.downstream_impact.push(to);
      b.upstream_dependencies.push(from);
    }
  };

  link('maintenance', 'downtime', 0.85);
  link('downtime', 'delay', 0.8);
  link('delay', 'queue', 0.75);
  link('queue', 'throughput', 0.7);
  link('setup', 'queue', 0.65);
  link('rework', 'waste', 0.82);
  link('waste', 'efficiency', 0.78);
  link('production', 'throughput', 0.72);
  link('throughput', 'oee', 0.88);
  link('quality', 'nc', 0.9);
  link('nc', 'rework', 0.7);
  link('production', 'quality', 0.55);

  return {
    nodes,
    node_count: nodes.length,
    graph_readiness: nodes.filter((n) => n.confidence_score >= 0.6).length / nodes.length,
    auto_mutation: false
  };
}

module.exports = { buildProductionOperationalGraph, NODE_TYPES };
