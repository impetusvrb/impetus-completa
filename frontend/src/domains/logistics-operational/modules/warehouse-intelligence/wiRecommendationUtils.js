/** OPM-007 — Recomendações explicáveis e rastreáveis (informativas — sem acção automática). */
export function computeWiRecommendations({
  heatmaps,
  capacity,
  bottlenecks,
  flow,
  transfers = []
}) {
  const recs = [];

  for (const c of (capacity || []).filter((x) => x.critical)) {
    recs.push({
      id: `rec-cap-${c.warehouse_id}`,
      type: 'capacity',
      priority: 'high',
      title: `Capacidade crítica · ${c.warehouse}`,
      message: 'Executar redistribuição interna ou transferência entre armazéns',
      action: 'informativo',
      trace: { source: 'wiCapacityUtils', warehouse_id: c.warehouse_id, occupancy_pct: c.occupancy_pct }
    });
  }

  for (const z of (heatmaps?.congested || []).slice(0, 3)) {
    recs.push({
      id: `rec-zone-${z.id}`,
      type: 'relocation',
      priority: 'medium',
      title: `Mover estoque da zona congestionada · ${z.id}`,
      message: 'Considerar relocation para zona subutilizada',
      action: 'informativo',
      trace: { source: 'wiHeatmapUtils', zone: z.id, movement_count: z.count }
    });
  }

  for (const u of (heatmaps?.underused || []).slice(0, 2)) {
    recs.push({
      id: `rec-repl-${u.id}`,
      type: 'replenishment',
      priority: 'low',
      title: `Zona subutilizada · ${u.id}`,
      message: 'Oportunidade replenishment picking',
      action: 'informativo',
      trace: { source: 'wiHeatmapUtils', zone: u.id, movement_count: u.count }
    });
  }

  for (const b of bottlenecks || []) {
    recs.push({
      id: `rec-bn-${b.module}`,
      type: 'bottleneck',
      priority: b.severity === 'high' ? 'high' : 'medium',
      title: `Priorizar ${b.moduleLabel}`,
      message: b.hint,
      action: 'informativo',
      trace: b.trace
    });
  }

  const xfrPending = transfers.filter((t) => t.status !== 'received').length;
  if (xfrPending >= 2) {
    recs.push({
      id: 'rec-xfr-balance',
      type: 'transfer',
      priority: 'medium',
      title: 'Balancear transferências internas',
      message: 'Priorizar conclusão transferências pendentes',
      action: 'informativo',
      trace: { source: 'GET /v1/transfers', pending: xfrPending }
    });
  }

  if (flow?.summary?.totalOpenQueues > 10) {
    recs.push({
      id: 'rec-flow-balance',
      type: 'flow',
      priority: 'high',
      title: 'Balancear filas operacionais',
      message: 'Filas elevadas em múltiplos estágios — revisar priorização docas',
      action: 'informativo',
      trace: { source: 'wiFlowAnalyticsUtils', totalOpenQueues: flow.summary.totalOpenQueues }
    });
  }

  return recs.sort((a, b) => {
    const p = { high: 0, medium: 1, low: 2 };
    return (p[a.priority] ?? 9) - (p[b.priority] ?? 9);
  });
}

export function buildRecommendationRows(recommendations = []) {
  return recommendations.map((r) => ({
    id: r.id,
    type: r.type,
    priority: r.priority,
    title: r.title,
    message: r.message,
    trace_source: r.trace?.source || '—',
    _recommendation: r
  }));
}
