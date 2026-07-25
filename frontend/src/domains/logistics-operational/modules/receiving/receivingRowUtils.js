import { resolveReceivingOperationalStatus, labelForOperationalStatus } from './receivingListUtils.js';

function whLabel(map, id) {
  if (!id) return '—';
  const w = map.get(id);
  return w?.code || w?.name || String(id).slice(0, 8);
}

function dockLabel(dockMap, dockId) {
  if (!dockId) return '—';
  const d = dockMap.get(dockId);
  return d?.location_code || d?.code || d?.name || String(dockId).slice(0, 8);
}

function formatTs(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('pt-BR');
  } catch {
    return '—';
  }
}

export function buildReceivingRows({ orders = [], warehouses = [], docks = [] }) {
  const whMap = new Map(warehouses.map((w) => [w.id, w]));
  const dockMap = new Map(docks.map((d) => [d.id, d]));

  return orders.map((order) => {
    const meta = order.metadata || {};
    const opStatus = resolveReceivingOperationalStatus(order);
    const lines = meta.lines || meta.receipt_lines || [];
    const qtyReceived = lines.reduce((s, l) => s + (Number(l.quantity_received) || 0), 0);

    return {
      id: order.id,
      order_number: order.order_number || '—',
      asn_number: meta.asn_number || order.order_number || '—',
      supplier: meta.supplier_name || order.supplier_ref || '—',
      supplier_id: meta.supplier_id || order.supplier_ref || '',
      po_number: meta.po_number || meta.purchase_order || '—',
      dock: dockLabel(dockMap, meta.dock_id),
      dock_id: meta.dock_id || '',
      warehouse: whLabel(whMap, order.warehouse_id),
      warehouse_id: order.warehouse_id,
      operational_status: opStatus,
      operational_status_label: labelForOperationalStatus(opStatus),
      api_status: order.status,
      expected_at: formatTs(order.expected_at || meta.expected_at),
      qty_received: qtyReceived || meta.qty_received || 0,
      qty_expected: meta.qty_expected ?? meta.asn_qty ?? '—',
      inspection_pending: meta.inspection_status === 'pending' || meta.quality_hold === true,
      quarantine: meta.quarantine === true || meta.inspection_status === 'quarantine',
      divergence: meta.divergence === true || (meta.divergence_count || 0) > 0,
      sla_hours: meta.sla_hours ?? null,
      last_event_at: formatTs(meta.last_event_at || order.updated_at),
      _order: order
    };
  });
}

export function buildReceivingTimelineEvents(orders = []) {
  const events = [];
  for (const order of orders) {
    const meta = order.metadata || {};
    const base = { order_id: order.id, asn: meta.asn_number || order.order_number };
    if (order.created_at) {
      events.push({
        id: `${order.id}-asn-created`,
        ts: order.created_at,
        type: 'asn_created',
        order_id: order.id,
        supplier: meta.supplier_name || order.supplier_ref,
        dock_id: meta.dock_id,
        operator: meta.operator
      });
    }
    for (const ev of meta.timeline_events || []) {
      events.push({ ...ev, id: ev.id || `${order.id}-${ev.type}-${ev.ts}`, order_id: order.id });
    }
    if (meta.truck_arrived_at) {
      events.push({ id: `${order.id}-truck`, ts: meta.truck_arrived_at, type: 'truck_arrived', ...base });
    }
    if (meta.unload_started_at) {
      events.push({ id: `${order.id}-unload`, ts: meta.unload_started_at, type: 'unload_started', ...base });
    }
    if (meta.inspection_started_at) {
      events.push({ id: `${order.id}-insp`, ts: meta.inspection_started_at, type: 'inspection_started', ...base });
    }
    if (meta.divergence_at) {
      events.push({ id: `${order.id}-div`, ts: meta.divergence_at, type: 'divergence', ...base });
    }
    if (meta.stock_updated_at) {
      events.push({ id: `${order.id}-stock`, ts: meta.stock_updated_at, type: 'stock_updated', ...base });
    }
    if (order.status === 'completed' && order.updated_at) {
      events.push({ id: `${order.id}-done`, ts: order.updated_at, type: 'completed', ...base });
    }
  }
  return events.sort((a, b) => new Date(b.ts) - new Date(a.ts));
}
