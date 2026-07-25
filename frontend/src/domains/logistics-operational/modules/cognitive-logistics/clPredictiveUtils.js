/** OPM-008 — Predictive insights (heurísticas explicáveis). */
import { getHeuristicRule } from './clHeuristicRules.js';

export function computePredictiveInsights({ capacity = [], flow, bottlenecks = [], heatmaps, snapshot = {} }) {
  const insights = [];
  const { receiving = [], picking = [], shipping = [] } = snapshot;

  for (const c of capacity.filter((x) => x.trend === 'saturation_risk' || x.critical)) {
    const rule = getHeuristicRule('RULE-CAP-SAT');
    insights.push({
      id: `pred-cap-${c.warehouse_id}`,
      ruleId: rule.id,
      category: 'capacity_saturation',
      severity: c.critical ? 'high' : 'medium',
      title: `Saturação prevista · ${c.warehouse}`,
      message: `Ocupação ${c.occupancy_pct}% — tendência ${c.trend}`,
      horizon: '7-14 dias',
      confidence: c.critical ? 0.9 : rule.confidenceBase,
      evidence: [{ type: 'metric', key: 'occupancy_pct', value: c.occupancy_pct }, { type: 'metric', key: 'trend', value: c.trend }],
      modules: rule.modules
    });
  }

  const openQueues = flow?.summary?.totalOpenQueues ?? 0;
  if (openQueues >= 8) {
    const rule = getHeuristicRule('RULE-QUEUE-GROWTH');
    insights.push({
      id: 'pred-queue-growth',
      ruleId: rule.id,
      category: 'queue_growth',
      severity: openQueues > 15 ? 'high' : 'medium',
      title: 'Crescimento filas operacionais',
      message: `${openQueues} filas abertas — lead time em aumento provável`,
      horizon: '3-7 dias',
      confidence: Math.min(0.95, rule.confidenceBase + openQueues * 0.01),
      evidence: [{ type: 'metric', key: 'totalOpenQueues', value: openQueues }],
      modules: rule.modules
    });
  }

  const slaBreaches = [...receiving, ...picking, ...shipping].filter((o) => o.metadata?.sla_breach).length;
  if (slaBreaches > 0) {
    const rule = getHeuristicRule('RULE-SLA-DEG');
    insights.push({
      id: 'pred-sla-degradation',
      ruleId: rule.id,
      category: 'sla_degradation',
      severity: slaBreaches > 2 ? 'high' : 'medium',
      title: 'Degradação SLA consolidado',
      message: `${slaBreaches} excepção(ões) SLA detectadas`,
      horizon: 'imediato',
      confidence: rule.confidenceBase,
      evidence: [{ type: 'metric', key: 'slaBreaches', value: slaBreaches }],
      modules: rule.modules
    });
  }

  for (const z of (heatmaps?.congested || []).slice(0, 3)) {
    if (z.count < 5) continue;
    const rule = getHeuristicRule('RULE-HOTSPOT');
    insights.push({
      id: `pred-hotspot-${z.id}`,
      ruleId: rule.id,
      category: 'recurrent_hotspot',
      severity: z.level === 'high' ? 'high' : 'medium',
      title: `Hotspot recorrente · ${z.id}`,
      message: `${z.count} movimentações — zona congestionada recorrente`,
      horizon: 'contínuo',
      confidence: Math.min(0.92, rule.confidenceBase + z.count * 0.02),
      evidence: [{ type: 'metric', key: 'movement_count', value: z.count, zone: z.id }],
      modules: rule.modules
    });
  }

  const leadTimeProxy = openQueues + bottlenecks.length * 2;
  if (leadTimeProxy > 6) {
    insights.push({
      id: 'pred-lead-time',
      ruleId: 'RULE-QUEUE-GROWTH',
      category: 'lead_time_increase',
      severity: leadTimeProxy > 12 ? 'high' : 'medium',
      title: 'Aumento lead time operacional',
      message: `Índice composto ${leadTimeProxy} (filas + gargalos)`,
      horizon: '5-10 dias',
      confidence: 0.74,
      evidence: [{ type: 'metric', key: 'leadTimeProxy', value: leadTimeProxy }],
      modules: ['receiving', 'picking', 'shipping', 'transfers']
    });
  }

  return insights.sort((a, b) => {
    const sev = { high: 0, medium: 1, low: 2 };
    return (sev[a.severity] ?? 9) - (sev[b.severity] ?? 9);
  });
}
