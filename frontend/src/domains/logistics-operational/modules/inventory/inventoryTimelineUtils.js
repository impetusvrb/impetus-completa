const TYPE_LABELS = Object.freeze({
  receipt: 'Entrada',
  putaway: 'Entrada',
  issue: 'Saída',
  pick: 'Saída',
  ship: 'Saída',
  transfer: 'Transferência',
  adjustment: 'Ajuste',
  adjust: 'Ajuste',
  count: 'Inventário',
  inventory: 'Inventário',
  reserve: 'Reserva',
  reservation: 'Reserva'
});

function formatTs(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('pt-BR');
  } catch {
    return '—';
  }
}

function classifyMovementType(type) {
  const t = String(type || '').toLowerCase();
  for (const [key, label] of Object.entries(TYPE_LABELS)) {
    if (t.includes(key)) return label;
  }
  return 'Movimentação';
}

export function filterMovementsByPeriod(movements, periodDays) {
  if (periodDays == null) return movements;
  const cutoff = Date.now() - periodDays * 86400000;
  return movements.filter((m) => {
    const d = new Date(m.created_at || m.posted_at || 0);
    return !Number.isNaN(d.getTime()) && d.getTime() >= cutoff;
  });
}

function movementUser(m) {
  const meta = m.metadata || {};
  return String(m.created_by || m.user_name || meta.user_id || meta.created_by || meta.operator || '').toLowerCase();
}

export function filterMovementsByTimelineFilters(
  movements,
  { userFilter = '', warehouseFilter = '', productFilter = '' } = {}
) {
  let list = movements;
  const uq = userFilter.trim().toLowerCase();
  if (uq) list = list.filter((m) => movementUser(m).includes(uq));
  if (warehouseFilter) list = list.filter((m) => m.warehouse_id === warehouseFilter);
  if (productFilter) list = list.filter((m) => m.item_id === productFilter);
  return list;
}

export function buildInventoryTimeline({
  movements = [],
  itemId = null,
  warehouseId = null,
  periodDays = 30,
  userFilter = '',
  warehouseFilter = '',
  productFilter = '',
  limit = 25
}) {
  let list = filterMovementsByPeriod(movements, periodDays);
  list = filterMovementsByTimelineFilters(list, { userFilter, warehouseFilter: warehouseFilter || warehouseId, productFilter: productFilter || itemId });
  if (itemId && !productFilter) list = list.filter((m) => m.item_id === itemId);
  if (warehouseId && !warehouseFilter) list = list.filter((m) => m.warehouse_id === warehouseId);

  return [...list]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, limit)
    .map((m) => ({
      id: m.id,
      ts: m.created_at,
      label: `${classifyMovementType(m.movement_type)} · ${m.movement_type || '—'} · ${m.quantity ?? '—'} ${m.uom || ''} · ${formatTs(m.created_at)}`
    }));
}

export { TYPE_LABELS, classifyMovementType };
