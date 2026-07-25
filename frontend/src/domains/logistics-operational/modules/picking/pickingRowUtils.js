import { resolvePickingOperationalStatus, labelForPickingStatus, PICKING_WAVE_TYPES } from './pickingListUtils.js';

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

function waveTypeLabel(type) {
  return PICKING_WAVE_TYPES.find((t) => t.id === type)?.label || type || '—';
}

export function buildPickingRows({ orders = [], warehouses = [] }) {
  const whMap = new Map(warehouses.map((w) => [w.id, w]));

  return orders.map((order) => {
    const meta = order.metadata || {};
    const opStatus = resolvePickingOperationalStatus(order);
    const lines = meta.pick_lines || meta.lines || [];
    const qtyPicked = lines.reduce((s, l) => s + (Number(l.qty_picked) || 0), 0);
    const routeStops = meta.route_stops || [];
    const routeProgress = routeStops.length
      ? Math.round(((meta.route_completed_stops || 0) / routeStops.length) * 100)
      : meta.route_progress ?? null;

    return {
      id: order.id,
      order_number: order.order_number || '—',
      wave_id: meta.wave_id || '—',
      wave_type: meta.wave_type || 'individual',
      wave_type_label: waveTypeLabel(meta.wave_type),
      operator: meta.operator_name || meta.operator || '—',
      operator_id: meta.operator_id || '',
      route_zone: meta.zone || meta.route_zone || '—',
      warehouse: whLabel(whMap, order.warehouse_id),
      warehouse_id: order.warehouse_id,
      priority: order.priority ?? meta.priority ?? 5,
      operational_status: opStatus,
      operational_status_label: labelForPickingStatus(opStatus),
      api_status: order.status,
      qty_lines: lines.length,
      qty_picked: qtyPicked || meta.qty_picked || 0,
      route_stops: routeStops.length,
      route_progress: routeProgress != null ? `${routeProgress}%` : '—',
      route_distance_m: meta.route_distance_m ?? '—',
      sla_breach: meta.sla_breach === true,
      exception: meta.exception === true || meta.stockout === true,
      divergence: meta.divergence === true || (meta.divergence_count || 0) > 0,
      started_at: formatTs(meta.picking_started_at),
      completed_at: formatTs(meta.picking_completed_at || (order.status === 'completed' ? order.updated_at : null)),
      last_event_at: formatTs(meta.last_event_at || order.updated_at),
      _order: order
    };
  });
}

export function buildPickingTimelineEvents(orders = []) {
  const events = [];
  for (const order of orders) {
    const meta = order.metadata || {};
    const base = { order_id: order.id, order_number: order.order_number, operator: meta.operator_name || meta.operator };

    if (order.created_at) {
      events.push({ id: `${order.id}-created`, ts: order.created_at, type: 'order_created', ...base });
    }
    if (meta.released_at || order.status === 'assigned') {
      events.push({
        id: `${order.id}-released`,
        ts: meta.released_at || order.updated_at,
        type: 'order_released',
        ...base
      });
    }
    if (meta.picking_started_at || order.status === 'picking') {
      events.push({
        id: `${order.id}-started`,
        ts: meta.picking_started_at || order.updated_at,
        type: 'picking_started',
        ...base
      });
    }
    if (meta.paused_at || meta.paused) {
      events.push({ id: `${order.id}-paused`, ts: meta.paused_at || order.updated_at, type: 'paused', ...base });
    }
    if (meta.divergence_at || meta.divergence) {
      events.push({ id: `${order.id}-div`, ts: meta.divergence_at || order.updated_at, type: 'divergence', ...base });
    }
    for (const ev of meta.timeline_events || []) {
      events.push({ ...ev, id: ev.id || `${order.id}-${ev.type}-${ev.ts}`, order_id: order.id });
    }
    if (order.status === 'completed' && order.updated_at) {
      events.push({ id: `${order.id}-done`, ts: order.updated_at, type: 'completed', ...base });
    }
  }
  return events.sort((a, b) => new Date(b.ts) - new Date(a.ts));
}
