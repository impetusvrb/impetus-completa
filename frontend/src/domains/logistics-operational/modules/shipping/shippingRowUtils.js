import { resolveShippingOperationalStatus, labelForShippingStatus } from './shippingListUtils.js';

function whLabel(map, id) {
  if (!id) return '—';
  const w = map.get(id);
  return w?.code || w?.name || String(id).slice(0, 8);
}

function formatTs(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('pt-BR');
  } catch {
    return '—';
  }
}

export function buildShippingRows({ orders = [], warehouses = [], docks = [] }) {
  const whMap = new Map(warehouses.map((w) => [w.id, w]));
  const dockMap = new Map(docks.map((d) => [d.id, d]));

  return orders.map((order) => {
    const meta = order.metadata || {};
    const opStatus = resolveShippingOperationalStatus(order);
    const volumes = meta.volumes || meta.load_units || [];
    const volCount = volumes.length || meta.volume_count || 0;

    return {
      id: order.id,
      order_number: order.order_number || '—',
      carrier: meta.carrier_name || order.carrier_ref || '—',
      carrier_id: meta.carrier_id || order.carrier_ref || '',
      load_id: meta.load_id || meta.shipment_id || '—',
      vehicle: meta.vehicle_plate || meta.vehicle || '—',
      outbound_dock: meta.outbound_dock_id
        ? dockMap.get(meta.outbound_dock_id)?.location_code || String(meta.outbound_dock_id).slice(0, 8)
        : '—',
      outbound_dock_id: meta.outbound_dock_id || '',
      warehouse: whLabel(whMap, order.warehouse_id),
      warehouse_id: order.warehouse_id,
      picking_ref: meta.picking_order_number || meta.picking_order_id?.slice(0, 8) || '—',
      operational_status: opStatus,
      operational_status_label: labelForShippingStatus(opStatus),
      api_status: order.status,
      volume_count: volCount,
      load_occupancy: meta.load_occupancy_pct != null ? `${meta.load_occupancy_pct}%` : '—',
      operator: meta.operator_name || meta.operator || '—',
      sla_breach: meta.sla_breach === true,
      divergence: meta.divergence === true,
      exception: meta.exception === true,
      loading_started_at: formatTs(meta.loading_started_at),
      shipped_at: formatTs(meta.shipped_at || (order.status === 'shipped' ? order.updated_at : null)),
      last_event_at: formatTs(meta.last_event_at || order.updated_at),
      _order: order
    };
  });
}

export function buildShippingTimelineEvents(orders = []) {
  const events = [];
  for (const order of orders) {
    const meta = order.metadata || {};
    const base = {
      order_id: order.id,
      order_number: order.order_number,
      carrier: meta.carrier_name || order.carrier_ref,
      operator: meta.operator_name || meta.operator,
      dock_id: meta.outbound_dock_id
    };

    if (order.created_at) {
      events.push({ id: `${order.id}-received`, ts: order.created_at, type: 'order_received', ...base });
    }
    if (meta.inspection_started_at || meta.inspecting) {
      events.push({
        id: `${order.id}-insp`,
        ts: meta.inspection_started_at || order.updated_at,
        type: 'inspection_started',
        ...base
      });
    }
    if (meta.divergence_at || meta.divergence) {
      events.push({ id: `${order.id}-div`, ts: meta.divergence_at || order.updated_at, type: 'divergence', ...base });
    }
    if (meta.loading_started_at || meta.loading) {
      events.push({ id: `${order.id}-load-start`, ts: meta.loading_started_at || order.updated_at, type: 'loading_started', ...base });
    }
    if (meta.loading_completed_at) {
      events.push({ id: `${order.id}-load-done`, ts: meta.loading_completed_at, type: 'loading_completed', ...base });
    }
    for (const ev of meta.timeline_events || []) {
      events.push({ ...ev, id: ev.id || `${order.id}-${ev.type}-${ev.ts}`, order_id: order.id });
    }
    if (order.status === 'shipped' && order.updated_at) {
      events.push({ id: `${order.id}-dispatched`, ts: order.updated_at, type: 'dispatched', ...base });
    }
  }
  return events.sort((a, b) => new Date(b.ts) - new Date(a.ts));
}

/** Ordens picking concluídas disponíveis para expedição */
export function linkCompletedPickingOrders(pickingOrders = [], shippingOrders = []) {
  const linkedPickingIds = new Set(
    shippingOrders.map((s) => s.metadata?.picking_order_id).filter(Boolean)
  );
  return pickingOrders.filter((p) => p.status === 'completed' && !linkedPickingIds.has(p.id));
}
