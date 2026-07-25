import { buildReceivingTimelineEvents } from '../receiving/receivingRowUtils.js';
import { buildPickingTimelineEvents } from '../picking/pickingRowUtils.js';
import { buildShippingTimelineEvents } from '../shipping/shippingRowUtils.js';
import { buildTransferTimelineEvents } from '../transfers/transferRowUtils.js';
import { buildInventoryTimeline } from '../inventory/inventoryTimelineUtils.js';

const TYPE_LABELS = Object.freeze({
  receiving: 'Receiving',
  inventory: 'Inventory',
  picking: 'Picking',
  shipping: 'Shipping',
  transfer: 'Transfer'
});

export const WI_TIMELINE_PERIODS = Object.freeze([
  { id: '7', label: '7 dias', days: 7 },
  { id: '30', label: '30 dias', days: 30 },
  { id: '90', label: '90 dias', days: 90 },
  { id: 'all', label: 'Tudo', days: null }
]);

export function buildWiConsolidatedTimelineEvents({
  receiving = [],
  movements = [],
  picking = [],
  shipping = [],
  transfers = []
}) {
  const events = [];

  for (const e of buildReceivingTimelineEvents(receiving)) {
    events.push({ ...e, domain: 'receiving', domainLabel: TYPE_LABELS.receiving });
  }
  for (const e of buildPickingTimelineEvents(picking)) {
    events.push({ ...e, domain: 'picking', domainLabel: TYPE_LABELS.picking });
  }
  for (const e of buildShippingTimelineEvents(shipping)) {
    events.push({ ...e, domain: 'shipping', domainLabel: TYPE_LABELS.shipping });
  }
  for (const e of buildTransferTimelineEvents(transfers)) {
    events.push({ ...e, domain: 'transfer', domainLabel: TYPE_LABELS.transfer });
  }
  for (const e of buildInventoryTimeline({ movements, periodDays: null, limit: 100 })) {
    events.push({
      id: e.id,
      ts: e.ts,
      type: 'movement',
      domain: 'inventory',
      domainLabel: TYPE_LABELS.inventory,
      label: e.label
    });
  }

  return events.sort((a, b) => new Date(b.ts) - new Date(a.ts));
}

export function filterWiTimeline(events, { periodDays = 30, warehouseFilter = '', domainFilter = 'all', operatorFilter = '' } = {}) {
  let list = events;
  if (periodDays != null) {
    const cutoff = Date.now() - periodDays * 86400000;
    list = list.filter((e) => new Date(e.ts).getTime() >= cutoff);
  }
  if (warehouseFilter) {
    list = list.filter((e) => e.warehouse_id === warehouseFilter || e.from_warehouse_id === warehouseFilter);
  }
  if (domainFilter !== 'all') list = list.filter((e) => e.domain === domainFilter);
  const oq = operatorFilter.trim().toLowerCase();
  if (oq) list = list.filter((e) => String(e.operator || '').toLowerCase().includes(oq));
  return list;
}

export function buildWiTimelineDisplay(opts) {
  return filterWiTimeline(opts.events || [], opts)
    .slice(0, opts.limit || 30)
    .map((e) => ({
      id: e.id,
      ts: e.ts,
      label: `${e.domainLabel || e.domain} · ${e.type || 'event'} · ${e.order_number || e.label || '—'}`
    }));
}

export function computeWiPerformance({ movements = [], picking = [], transfers = [] }) {
  const byOperator = new Map();
  for (const o of picking) {
    const op = o.metadata?.operator_name || o.metadata?.operator || '—';
    byOperator.set(op, (byOperator.get(op) || 0) + 1);
  }

  const replen = transfers.filter((t) => t.metadata?.internal_movement_type === 'replenishment').length;
  const crossDock = transfers.filter((t) => t.metadata?.internal_movement_type === 'crossDock').length;
  const xfrDone = transfers.filter((t) => t.status === 'received').length;

  const moveDurations = movements
    .filter((m) => m.created_at)
    .slice(0, 50);

  return {
    operatorProductivity: [...byOperator.entries()].map(([operator, count]) => ({ operator, count })).sort((a, b) => b.count - a.count),
    replenishmentEfficiency: replen,
    crossDockEfficiency: crossDock,
    transferCompletionRate: transfers.length ? Math.round((xfrDone / transfers.length) * 100) : null,
    avgMovementSample: moveDurations.length
  };
}
