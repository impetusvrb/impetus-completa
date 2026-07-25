/** OPM-007 — KPIs consolidados (derivados de dados WMS-003). */
export function computeWiDashboardKpis({
  warehouses = [],
  balances = [],
  movements = [],
  receiving = [],
  picking = [],
  shipping = [],
  transfers = [],
  capacities = []
}) {
  const whCount = warehouses.length || 1;
  const totalQty = balances.reduce((s, b) => s + (Number(b.quantity_on_hand) || 0), 0);
  const zonesUsed = new Set(movements.map((m) => m.metadata?.zone_from || m.metadata?.zone_to).filter(Boolean)).size;
  const binsUsed = new Set(movements.map((m) => m.metadata?.bin_from || m.metadata?.bin_to || m.from_address_id).filter(Boolean)).size;

  const capacityTotal = capacities.reduce((s, c) => s + (Number(c.total_capacity) || Number(c.capacity) || 0), 0);
  const capacityUsed = capacities.reduce((s, c) => s + (Number(c.used_capacity) || 0), 0);
  const capacityPct = capacityTotal > 0 ? Math.round((capacityUsed / capacityTotal) * 100) : null;

  const throughput = movements.filter((m) => {
    const d = new Date(m.created_at || 0);
    return Date.now() - d.getTime() < 7 * 86400000;
  }).length;

  const openQueues =
    receiving.filter((o) => o.status !== 'completed').length +
    picking.filter((o) => o.status !== 'completed').length +
    shipping.filter((o) => o.status !== 'shipped' && o.status !== 'cancelled').length +
    transfers.filter((o) => o.status !== 'received' && o.status !== 'cancelled').length;

  const slaBreaches =
    [...receiving, ...picking, ...shipping, ...transfers].filter((o) => o.metadata?.sla_breach).length;

  const congestionIndex = openQueues > 0 ? Math.min(100, Math.round((openQueues / (whCount * 10)) * 100)) : 0;

  const items = [
    { id: 'wh_occupancy', label: 'Ocupação armazéns', value: capacityPct != null ? `${capacityPct}%` : `${whCount} WH`, accent: 'cyan' },
    { id: 'zone_util', label: 'Zonas activas', value: zonesUsed, accent: 'cyan' },
    { id: 'bin_util', label: 'Bins movimentados', value: binsUsed, accent: 'cyan' },
    { id: 'capacity_avail', label: 'Capacidade disp.', value: capacityTotal ? capacityTotal - capacityUsed : '—', accent: 'green' },
    { id: 'stock_turn', label: 'Giro (mov/7d)', value: throughput, accent: 'amber' },
    { id: 'throughput', label: 'Throughput', value: throughput, accent: 'cyan' },
    { id: 'lead_time', label: 'Filas abertas', value: openQueues, accent: openQueues > 5 ? 'amber' : 'green' },
    { id: 'sla', label: 'SLA consolidado', value: slaBreaches ? `${slaBreaches} exc.` : 'OK', accent: slaBreaches ? 'red' : 'green' },
    { id: 'efficiency', label: 'Eficiência log.', value: `${100 - congestionIndex}%`, accent: 'green' },
    { id: 'congestion', label: 'Congestionamento', value: `${congestionIndex}%`, accent: congestionIndex > 50 ? 'red' : 'cyan' }
  ];

  return { items, partial: !capacities.length };
}
