import {
  resolveTransferOperationalStatus,
  labelForTransferStatus,
  resolveInternalMovementType,
  labelForInternalType
} from './transferListUtils.js';

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

export function buildTransferRows({ orders = [], warehouses = [] }) {
  const whMap = new Map(warehouses.map((w) => [w.id, w]));

  return orders.map((order) => {
    const meta = order.metadata || {};
    const opStatus = resolveTransferOperationalStatus(order);
    const internalType = resolveInternalMovementType(order);
    const lines = meta.transfer_lines || meta.lines || [];
    const qtyTotal = lines.reduce((s, l) => s + (Number(l.quantity ?? l.qty) || 0), 0) || meta.qty_total || 0;

    return {
      id: order.id,
      order_number: order.order_number || '—',
      from_warehouse: whLabel(whMap, order.from_warehouse_id),
      from_warehouse_id: order.from_warehouse_id,
      to_warehouse: whLabel(whMap, order.to_warehouse_id),
      to_warehouse_id: order.to_warehouse_id,
      internal_type: internalType,
      internal_type_label: labelForInternalType(internalType),
      zone_from: meta.zone_from || meta.from_zone || '—',
      zone_to: meta.zone_to || meta.to_zone || '—',
      bin_from: meta.bin_from || meta.from_bin || '—',
      bin_to: meta.bin_to || meta.to_bin || '—',
      operational_status: opStatus,
      operational_status_label: labelForTransferStatus(opStatus),
      api_status: order.status,
      priority: order.priority ?? meta.priority ?? 5,
      qty_total: qtyTotal,
      line_count: lines.length,
      operator: meta.operator_name || meta.operator || '—',
      sla_breach: meta.sla_breach === true,
      divergence: meta.divergence === true,
      exception: meta.exception === true || meta.blocked === true,
      started_at: formatTs(meta.execution_started_at),
      completed_at: formatTs(meta.completed_at || (order.status === 'received' ? order.updated_at : null)),
      last_event_at: formatTs(meta.last_event_at || order.updated_at),
      _order: order
    };
  });
}

export function buildTransferTimelineEvents(orders = []) {
  const events = [];
  for (const order of orders) {
    const meta = order.metadata || {};
    const base = {
      order_id: order.id,
      order_number: order.order_number,
      internal_type: resolveInternalMovementType(order),
      operator: meta.operator_name || meta.operator,
      from_warehouse_id: order.from_warehouse_id,
      to_warehouse_id: order.to_warehouse_id
    };

    if (order.created_at) {
      events.push({ id: `${order.id}-created`, ts: order.created_at, type: 'transfer_created', ...base });
    }
    if (meta.released_at || meta.released) {
      events.push({ id: `${order.id}-released`, ts: meta.released_at || order.updated_at, type: 'released', ...base });
    }
    if (meta.execution_started_at || meta.executing) {
      events.push({ id: `${order.id}-started`, ts: meta.execution_started_at || order.updated_at, type: 'execution_started', ...base });
    }
    if (meta.divergence_at || meta.divergence) {
      events.push({ id: `${order.id}-div`, ts: meta.divergence_at || order.updated_at, type: 'divergence', ...base });
    }
    if (meta.location_changed_at) {
      events.push({ id: `${order.id}-loc`, ts: meta.location_changed_at, type: 'location_changed', ...base });
    }
    if (meta.paused_at || meta.paused) {
      events.push({ id: `${order.id}-paused`, ts: meta.paused_at || order.updated_at, type: 'paused', ...base });
    }
    for (const ev of meta.timeline_events || []) {
      events.push({ ...ev, id: ev.id || `${order.id}-${ev.type}-${ev.ts}`, order_id: order.id });
    }
    if (order.status === 'received' && order.updated_at) {
      events.push({ id: `${order.id}-completed`, ts: order.updated_at, type: 'completed', ...base });
    }
  }
  return events.sort((a, b) => new Date(b.ts) - new Date(a.ts));
}
