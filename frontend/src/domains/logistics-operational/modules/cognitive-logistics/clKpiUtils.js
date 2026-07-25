/** OPM-008 — KPIs estratégicos cognitivos (derivados OPM-007 + WMS-003). */
export function computeClDashboardKpis({ wiKpis = [], capacity = [], flow, bottlenecks = [], snapshot = {} }) {
  const { receiving = [], picking = [], shipping = [], transfers = [], movements = [] } = snapshot;

  const criticalCap = capacity.filter((c) => c.critical).length;
  const openQueues = flow?.summary?.totalOpenQueues ?? 0;
  const slaBreaches = [...receiving, ...picking, ...shipping, ...transfers].filter((o) => o.metadata?.sla_breach).length;
  const bnHigh = bottlenecks.filter((b) => b.severity === 'high').length;

  const throughput7d = movements.filter((m) => Date.now() - new Date(m.created_at || 0).getTime() < 7 * 86400000).length;
  const avgOcc = capacity.length
    ? Math.round(capacity.reduce((s, c) => s + (c.occupancy_pct || 0), 0) / capacity.length)
    : null;

  const riskScore = Math.min(100, bnHigh * 20 + criticalCap * 15 + openQueues * 3 + slaBreaches * 10);
  const healthScore = Math.max(0, 100 - riskScore);
  const congestionRisk = openQueues > 10 ? 'high' : openQueues > 5 ? 'medium' : 'low';
  const stockoutRisk = picking.filter((o) => o.status !== 'completed' && o.metadata?.shortage).length > 0 ? 'medium' : 'low';

  const occTrend = capacity.some((c) => c.trend === 'saturation_risk') ? 'up' : avgOcc != null && avgOcc < 30 ? 'down' : 'stable';
  const throughputTrend = throughput7d > 50 ? 'up' : throughput7d < 10 ? 'down' : 'stable';
  const efficiencyGlobal = wiKpis.find((k) => k.id === 'efficiency')?.value ?? `${healthScore}%`;

  const items = [
    { id: 'health_score', label: 'Health Score', value: `${healthScore}`, accent: healthScore >= 70 ? 'green' : healthScore >= 40 ? 'amber' : 'red' },
    { id: 'operational_risk', label: 'Risco operacional', value: `${riskScore}`, accent: riskScore > 50 ? 'red' : riskScore > 25 ? 'amber' : 'green' },
    { id: 'logistics_efficiency', label: 'Eficiência logística', value: efficiencyGlobal, accent: 'cyan' },
    { id: 'occupancy_trend', label: 'Tend. ocupação', value: occTrend === 'up' ? '↑ saturação' : occTrend === 'down' ? '↓ subutil.' : '→ estável', accent: occTrend === 'up' ? 'amber' : 'cyan' },
    { id: 'throughput_trend', label: 'Tend. throughput', value: throughputTrend === 'up' ? '↑' : throughputTrend === 'down' ? '↓' : '→', accent: 'cyan' },
    { id: 'stockout_risk', label: 'Risco ruptura', value: stockoutRisk === 'medium' ? 'Médio' : 'Baixo', accent: stockoutRisk === 'medium' ? 'amber' : 'green' },
    { id: 'congestion_risk', label: 'Risco congestão', value: congestionRisk === 'high' ? 'Alto' : congestionRisk === 'medium' ? 'Médio' : 'Baixo', accent: congestionRisk === 'high' ? 'red' : congestionRisk === 'medium' ? 'amber' : 'green' },
    { id: 'global_efficiency', label: 'Eficiência global', value: `${healthScore}%`, accent: 'green' }
  ];

  return { items, partial: !capacity.length, healthScore, riskScore };
}
