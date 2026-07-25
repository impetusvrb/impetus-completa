import { unavailableLabel } from '../inventory/inventoryOperationalMessages.js';

const TYPE_LABELS = Object.freeze({
  order_received: 'Ordem recebida',
  inspection_started: 'Conferência iniciada',
  divergence: 'Divergência',
  loading_started: 'Carregamento iniciado',
  loading_completed: 'Carregamento concluído',
  dispatched: 'Expedição concluída'
});

export function filterShippingTimelineByPeriod(events, periodDays) {
  if (periodDays == null) return events;
  const cutoff = Date.now() - periodDays * 86400000;
  return events.filter((e) => {
    const d = new Date(e.ts || 0);
    return !Number.isNaN(d.getTime()) && d.getTime() >= cutoff;
  });
}

export function filterShippingTimelineEvents(
  events,
  { carrierFilter = '', operatorFilter = '', dockFilter = '', orderFilter = '' } = {}
) {
  let list = events;
  const cq = carrierFilter.trim().toLowerCase();
  if (cq) list = list.filter((e) => String(e.carrier || '').toLowerCase().includes(cq));
  const oq = operatorFilter.trim().toLowerCase();
  if (oq) list = list.filter((e) => String(e.operator || '').toLowerCase().includes(oq));
  if (dockFilter) list = list.filter((e) => e.dock_id === dockFilter);
  if (orderFilter) list = list.filter((e) => e.order_id === orderFilter);
  return list;
}

export function buildShippingTimelineDisplay({
  events = [],
  periodDays = 30,
  carrierFilter,
  operatorFilter,
  dockFilter,
  orderFilter,
  limit = 25
}) {
  let list = filterShippingTimelineByPeriod(events, periodDays);
  list = filterShippingTimelineEvents(list, { carrierFilter, operatorFilter, dockFilter, orderFilter });

  return list.slice(0, limit).map((e) => ({
    id: e.id,
    ts: e.ts,
    label: `${TYPE_LABELS[e.type] || e.type} · ${e.order_number || e.order_id?.slice(0, 8) || '—'} · ${formatTs(e.ts)}`
  }));
}

function formatTs(v) {
  if (!v) return unavailableLabel();
  try {
    return new Date(v).toLocaleString('pt-BR');
  } catch {
    return unavailableLabel();
  }
}

export { TYPE_LABELS };
