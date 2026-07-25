/** OPM-005 — Docas de saída (locations type dock). */
export async function loadAllOutboundDocks(warehouses, listLocationsFn) {
  const docks = [];
  for (const wh of warehouses) {
    try {
      const res = await listLocationsFn(wh.id);
      const rows = res?.data || res?.items || res || [];
      const list = Array.isArray(rows) ? rows : [];
      for (const loc of list) {
        const t = String(loc.location_type || '').toLowerCase();
        if (t === 'dock' || t === 'outbound_dock' || t.includes('dock')) {
          docks.push({ ...loc, warehouse_id: wh.id, code: loc.location_code || loc.code });
        }
      }
    } catch {
      /* noop */
    }
  }
  return docks;
}

export function buildOutboundDockView({ docks = [], orders = [] }) {
  return docks.map((d) => {
    const active = orders.find(
      (o) => o.metadata?.outbound_dock_id === d.id && (o.metadata?.loading || o.status === 'staged')
    );
    const meta = active?.metadata || {};
    return {
      id: d.id,
      code: d.location_code || d.code || d.id,
      status: active ? 'occupied' : 'available',
      statusLabel: active ? 'Ocupada' : 'Disponível',
      order_number: active?.order_number || '—',
      vehicle: meta.vehicle_plate || '—',
      carrier: meta.carrier_name || active?.carrier_ref || '—',
      operator: meta.operator_name || '—',
      dwell_minutes: meta.loading_started_at
        ? Math.round((Date.now() - new Date(meta.loading_started_at)) / 60000)
        : 0
    };
  });
}
