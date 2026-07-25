import { TRANSFER_INTERNAL_TYPES } from './transferListUtils.js';

export function computeTransferKpis({ orders = [], loadMeta = null }) {
  const partial = false;
  const pending = orders.filter((o) => ['open'].includes(o.status) && !o.metadata?.executing).length;
  const executing = orders.filter((o) => o.status === 'in_transit' || o.metadata?.executing).length;
  const completed = orders.filter((o) => o.status === 'received').length;
  const replenishment = orders.filter((o) => (o.metadata?.internal_movement_type || '') === 'replenishment').length;
  const relocation = orders.filter((o) => (o.metadata?.internal_movement_type || '') === 'relocation').length;
  const crossDock = orders.filter((o) => (o.metadata?.internal_movement_type || '') === 'crossDock').length;
  const exceptions = orders.filter((o) => o.metadata?.divergence || o.metadata?.exception || o.metadata?.blocked).length;

  const durations = orders
    .filter((o) => o.metadata?.execution_started_at && o.status === 'received')
    .map((o) => new Date(o.updated_at) - new Date(o.metadata.execution_started_at))
    .filter((d) => d > 0);
  const avgMs = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;

  const items = [
    { id: 'pending', label: 'Pendentes', value: pending, accent: 'cyan' },
    { id: 'executing', label: 'Em execução', value: executing, accent: 'amber' },
    { id: 'completed', label: 'Concluídas', value: completed, accent: 'green' },
    { id: 'replenishment', label: 'Replenishment pend.', value: replenishment, accent: 'cyan' },
    { id: 'relocation', label: 'Relocation pend.', value: relocation, accent: 'cyan' },
    { id: 'crossdock', label: 'Cross-dock activos', value: crossDock, accent: 'amber' },
    { id: 'sla', label: 'SLA interno', value: exceptions ? `${exceptions} exc.` : 'OK', accent: exceptions ? 'red' : 'green' },
    { id: 'avg_time', label: 'Tempo médio', value: avgMs != null ? `${Math.round(avgMs / 60000)} min` : '—', accent: 'cyan' },
    { id: 'exceptions', label: 'Excepções', value: exceptions, accent: exceptions ? 'red' : 'green' },
    { id: 'sync', label: 'Sync', value: loadMeta?.loaded_at ? 'LIVE' : '—', accent: 'green' }
  ];

  return { items, partial };
}

export function computeTransferIntelligence({ orders = [] }) {
  const byType = Object.fromEntries(TRANSFER_INTERNAL_TYPES.map((t) => [t.id, 0]));
  const zonePairs = new Map();
  let crossDockActive = 0;

  for (const o of orders) {
    const t = o.metadata?.internal_movement_type || 'transfer';
    if (byType[t] != null) byType[t] += 1;
    if (t === 'crossDock' && o.status !== 'received') crossDockActive += 1;
    const zf = o.metadata?.zone_from || '—';
    const zt = o.metadata?.zone_to || '—';
    const key = `${zf}→${zt}`;
    zonePairs.set(key, (zonePairs.get(key) || 0) + 1);
  }

  const topZones = [...zonePairs.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([route, count]) => ({ route, count }));

  const recurrent = orders.filter((o) => o.metadata?.recurrent === true).length;

  return {
    byType,
    crossDockActive,
    topZones,
    recurrent,
    congestionHint: topZones[0]?.count > 3 ? topZones[0].route : null
  };
}
