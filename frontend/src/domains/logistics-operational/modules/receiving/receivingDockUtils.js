/** OPM-003 — Docas via WMS-003 locations (location_type = dock). */

export function extractDockLocations(locations = []) {
  return locations.filter((loc) => {
    const t = String(loc.location_type || loc.type || '').toLowerCase();
    return t === 'dock' || t.includes('dock') || t.includes('doca');
  });
}

export function buildDockOperationalView({ docks = [], orders = [] }) {
  const occupied = new Map();
  const queue = [];

  for (const o of orders) {
    const meta = o.metadata || {};
    if (!meta.dock_id) {
      if (o.status === 'open' || o.status === 'in_progress') queue.push(o);
      continue;
    }
    if (o.status === 'in_progress' || o.status === 'open') {
      occupied.set(meta.dock_id, o);
    }
  }

  return docks.map((dock) => {
    const active = occupied.get(dock.id);
    const meta = active?.metadata || {};
    return {
      id: dock.id,
      code: dock.location_code || dock.code || dock.name,
      status: active ? 'occupied' : 'available',
      statusLabel: active ? 'Ocupada' : 'Disponível',
      order_number: active?.order_number || '—',
      scheduled_at: meta.scheduled_at || active?.expected_at || '—',
      dwell_minutes: meta.dwell_minutes ?? '—',
      priority: meta.priority ?? meta.truck_priority ?? '—',
      truck_ref: meta.truck_ref || '—'
    };
  }).concat(
    queue.length
      ? [{ id: 'queue', code: 'FILA', status: 'queue', statusLabel: `${queue.length} caminhão(ões)`, order_number: '—', scheduled_at: '—', dwell_minutes: '—', priority: '—', truck_ref: '—' }]
      : []
  );
}

export async function loadAllDockLocations(warehouses, listLocationsFn) {
  const all = [];
  for (const wh of warehouses) {
    try {
      const res = await listLocationsFn(wh.id);
      const rows = res?.data ?? res?.items ?? res ?? [];
      const list = Array.isArray(rows) ? rows : [];
      for (const loc of list) {
        all.push({ ...loc, warehouse_id: wh.id });
      }
    } catch {
      /* warehouse sem locations */
    }
  }
  return extractDockLocations(all);
}
