import { TRANSFER_INTERNAL_TYPES } from './transferListUtils.js';

export const TRANSFER_TIMELINE_PERIODS = Object.freeze([
  { id: '7', label: '7 dias', days: 7 },
  { id: '30', label: '30 dias', days: 30 },
  { id: '90', label: '90 dias', days: 90 },
  { id: 'all', label: 'Tudo', days: null }
]);

const TYPE_LABELS = Object.freeze({
  transfer_created: 'Transferência criada',
  released: 'Liberação',
  execution_started: 'Execução iniciada',
  divergence: 'Divergência',
  location_changed: 'Mudança de localização',
  paused: 'Pausada',
  completed: 'Conclusão'
});

export function filterTransferTimelineByPeriod(events, periodDays) {
  if (periodDays == null) return events;
  const cutoff = Date.now() - periodDays * 86400000;
  return events.filter((e) => new Date(e.ts).getTime() >= cutoff);
}

export function filterTransferTimelineEvents(
  events,
  { operatorFilter = '', warehouseFilter = '', typeFilter = 'all' } = {}
) {
  let list = events;
  const oq = operatorFilter.trim().toLowerCase();
  if (oq) list = list.filter((e) => String(e.operator || '').toLowerCase().includes(oq));
  if (warehouseFilter) {
    list = list.filter(
      (e) => e.from_warehouse_id === warehouseFilter || e.to_warehouse_id === warehouseFilter
    );
  }
  if (typeFilter !== 'all') list = list.filter((e) => e.internal_type === typeFilter);
  return list;
}

export function buildTransferTimelineDisplay({
  events = [],
  periodDays = 30,
  operatorFilter = '',
  warehouseFilter = '',
  typeFilter = 'all',
  limit = 25
}) {
  let list = filterTransferTimelineByPeriod(events, periodDays);
  list = filterTransferTimelineEvents(list, { operatorFilter, warehouseFilter, typeFilter });
  return [...list]
    .sort((a, b) => new Date(b.ts) - new Date(a.ts))
    .slice(0, limit)
    .map((e) => ({
      id: e.id,
      ts: e.ts,
      label: `${TYPE_LABELS[e.type] || e.type} · ${e.order_number || '—'} · ${e.internal_type || 'transfer'}`
    }));
}

export function buildTransferTypePanels(orders = []) {
  return TRANSFER_INTERNAL_TYPES.map((type) => ({
    ...type,
    count: orders.filter((o) => (o.metadata?.internal_movement_type || 'transfer') === type.id).length,
    active: orders.filter(
      (o) =>
        (o.metadata?.internal_movement_type || 'transfer') === type.id &&
        o.status !== 'received' &&
        o.status !== 'cancelled'
    ).length
  }));
}
