/** OPM-005 — Consolidação de carga (volumes · pallets · containers). */
export function buildLoadConsolidationView(orders = []) {
  const loads = new Map();

  for (const order of orders) {
    const meta = order.metadata || {};
    const loadId = meta.load_id || meta.shipment_id || `load-${order.id}`;
    if (!loads.has(loadId)) {
      loads.set(loadId, {
        id: loadId,
        carrier: meta.carrier_name || order.carrier_ref || '—',
        vehicle: meta.vehicle_plate || meta.vehicle || '—',
        orders: [],
        volumes: 0,
        pallets: 0,
        containers: 0,
        occupancyPct: meta.load_occupancy_pct ?? null
      });
    }
    const load = loads.get(loadId);
    load.orders.push(order);
    const vols = meta.volumes || meta.load_units || [];
    load.volumes += vols.length || Number(meta.volume_count) || 0;
    load.pallets += Number(meta.pallet_count) || vols.filter((v) => v.type === 'pallet').length;
    load.containers += Number(meta.container_count) || vols.filter((v) => v.type === 'container').length;
    if (meta.load_occupancy_pct != null) load.occupancyPct = meta.load_occupancy_pct;
  }

  return [...loads.values()].sort((a, b) => b.orders.length - a.orders.length);
}
