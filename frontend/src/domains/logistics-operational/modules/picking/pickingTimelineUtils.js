import { unavailableLabel } from '../inventory/inventoryOperationalMessages.js';

const TYPE_LABELS = Object.freeze({
  order_created: 'Ordem criada',
  order_released: 'Ordem liberada',
  picking_started: 'Picking iniciado',
  paused: 'Pausa',
  divergence: 'Divergência',
  completed: 'Conclusão',
  route_viewed: 'Rota visualizada'
});

export function filterPickingTimelineByPeriod(events, periodDays) {
  if (periodDays == null) return events;
  const cutoff = Date.now() - periodDays * 86400000;
  return events.filter((e) => {
    const d = new Date(e.ts || 0);
    return !Number.isNaN(d.getTime()) && d.getTime() >= cutoff;
  });
}

export function filterPickingTimelineEvents(
  events,
  { operatorFilter = '', waveFilter = '', orderFilter = '' } = {}
) {
  let list = events;
  const oq = operatorFilter.trim().toLowerCase();
  if (oq) list = list.filter((e) => String(e.operator || '').toLowerCase().includes(oq));
  if (waveFilter) list = list.filter((e) => e.wave_id === waveFilter);
  if (orderFilter) list = list.filter((e) => e.order_id === orderFilter);
  return list;
}

export function buildPickingTimelineDisplay({
  events = [],
  periodDays = 30,
  operatorFilter,
  waveFilter,
  orderFilter,
  limit = 25
}) {
  let list = filterPickingTimelineByPeriod(events, periodDays);
  list = filterPickingTimelineEvents(list, { operatorFilter, waveFilter, orderFilter });

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
