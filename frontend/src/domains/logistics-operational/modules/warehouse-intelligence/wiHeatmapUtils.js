/** OPM-007 — Heatmaps operacionais (zonas · bins · congestão · subutilização). */
export function computeWiHeatmaps({ movements = [], balances = [], warehouses = [] }) {
  const zoneCounts = new Map();
  const binCounts = new Map();

  for (const m of movements) {
    const meta = m.metadata || {};
    const zf = meta.zone_from || meta.zone_to || '—';
    const bf = meta.bin_from || meta.bin_to || m.from_address_id || '—';
    zoneCounts.set(zf, (zoneCounts.get(zf) || 0) + 1);
    binCounts.set(bf, (binCounts.get(bf) || 0) + 1);
  }

  const zones = [...zoneCounts.entries()]
    .map(([id, count]) => ({ id, count, intensity: count }))
    .sort((a, b) => b.count - a.count);

  const bins = [...binCounts.entries()]
    .map(([id, count]) => ({ id, count, intensity: count }))
    .sort((a, b) => b.count - a.count);

  const maxZone = zones[0]?.count || 1;
  const congested = zones.filter((z) => z.count >= maxZone * 0.7).map((z) => ({ ...z, level: 'high' }));
  const underused = zones.filter((z) => z.count <= maxZone * 0.15 && z.id !== '—').map((z) => ({ ...z, level: 'low' }));

  const whStock = warehouses.map((w) => ({
    id: w.id,
    code: w.code || w.name,
    qty: balances.filter((b) => b.warehouse_id === w.id).reduce((s, b) => s + (Number(b.quantity_on_hand) || 0), 0)
  }));

  return { zones, bins, congested, underused, warehouseStock: whStock, preparedForGraphicalMap: true };
}
