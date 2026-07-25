/**
 * OPM-008 — Catálogo de regras heurísticas explicáveis (determinísticas).
 * Preparado para substituição/augmentação por modelos IA sem alterar interface pública.
 */
export const CL_HEURISTIC_RULES = Object.freeze([
  {
    id: 'RULE-CAP-SAT',
    name: 'Tendência saturação capacidade',
    category: 'predictive',
    inputs: ['capacity.occupancy_pct', 'capacity.trend'],
    threshold: { occupancy_pct: 85, trend: 'saturation_risk' },
    confidenceBase: 0.82,
    modules: ['warehouses', 'warehouse_intelligence']
  },
  {
    id: 'RULE-QUEUE-GROWTH',
    name: 'Crescimento filas operacionais',
    category: 'predictive',
    inputs: ['flow.summary.totalOpenQueues'],
    threshold: { totalOpenQueues: 8 },
    confidenceBase: 0.75,
    modules: ['receiving', 'picking', 'shipping', 'transfers']
  },
  {
    id: 'RULE-SLA-DEG',
    name: 'Degradação SLA consolidado',
    category: 'predictive',
    inputs: ['kpis.sla', 'bottlenecks'],
    threshold: { slaBreaches: 1 },
    confidenceBase: 0.88,
    modules: ['receiving', 'picking', 'shipping']
  },
  {
    id: 'RULE-HOTSPOT',
    name: 'Hotspot recorrente zona/bin',
    category: 'predictive',
    inputs: ['heatmaps.congested'],
    threshold: { minCount: 5 },
    confidenceBase: 0.7,
    modules: ['warehouse_intelligence', 'transfers']
  },
  {
    id: 'RULE-REPLEN',
    name: 'Antecipar replenishment',
    category: 'recommendation',
    inputs: ['heatmaps.underused', 'bottlenecks.picking'],
    confidenceBase: 0.78,
    modules: ['transfers', 'picking']
  },
  {
    id: 'RULE-REDIST',
    name: 'Redistribuir estoque',
    category: 'recommendation',
    inputs: ['capacity.critical', 'heatmaps.congested'],
    confidenceBase: 0.85,
    modules: ['transfers', 'inventory']
  },
  {
    id: 'RULE-DOCK-BAL',
    name: 'Balancear docas',
    category: 'recommendation',
    inputs: ['flow.stages.receiving', 'flow.stages.shipping'],
    confidenceBase: 0.72,
    modules: ['receiving', 'shipping']
  },
  {
    id: 'RULE-XFR-RESCH',
    name: 'Reprogramar transferências',
    category: 'recommendation',
    inputs: ['transfers.pending', 'capacity.critical'],
    confidenceBase: 0.8,
    modules: ['transfers']
  }
]);

export function getHeuristicRule(ruleId) {
  return CL_HEURISTIC_RULES.find((r) => r.id === ruleId) || null;
}
