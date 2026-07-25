import { unavailableLabel } from '../inventory/inventoryOperationalMessages.js';

const TYPE_LABELS = Object.freeze({
  asn_created: 'ASN criada',
  truck_arrived: 'Caminhão chegou',
  unload_started: 'Descarga iniciada',
  inspection_started: 'Conferência iniciada',
  divergence: 'Divergência encontrada',
  inspection_requested: 'Inspeção solicitada',
  stock_updated: 'Estoque actualizado',
  completed: 'Recebimento concluído',
  dock_assigned: 'Doca atribuída'
});

export function filterReceivingTimelineByPeriod(events, periodDays) {
  if (periodDays == null) return events;
  const cutoff = Date.now() - periodDays * 86400000;
  return events.filter((e) => {
    const d = new Date(e.ts || 0);
    return !Number.isNaN(d.getTime()) && d.getTime() >= cutoff;
  });
}

export function filterReceivingTimelineEvents(
  events,
  { supplierFilter = '', dockFilter = '', operatorFilter = '' } = {}
) {
  let list = events;
  const sq = supplierFilter.trim().toLowerCase();
  if (sq) list = list.filter((e) => String(e.supplier || '').toLowerCase().includes(sq));
  if (dockFilter) list = list.filter((e) => e.dock_id === dockFilter);
  const oq = operatorFilter.trim().toLowerCase();
  if (oq) list = list.filter((e) => String(e.operator || '').toLowerCase().includes(oq));
  return list;
}

export function buildReceivingTimelineDisplay({ events = [], periodDays = 30, supplierFilter, dockFilter, operatorFilter, limit = 25 }) {
  let list = filterReceivingTimelineByPeriod(events, periodDays);
  list = filterReceivingTimelineEvents(list, { supplierFilter, dockFilter, operatorFilter });

  return list.slice(0, limit).map((e) => ({
    id: e.id,
    ts: e.ts,
    label: `${TYPE_LABELS[e.type] || e.type} · ${e.asn || e.order_id?.slice(0, 8) || '—'} · ${formatTs(e.ts)}`
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
