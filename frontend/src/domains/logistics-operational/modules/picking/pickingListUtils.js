/** OPM-004 — Estados operacionais Order Fulfillment / Picking. */
export const PICKING_ORDER_STATUSES = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: 'pending', label: 'Pendente' },
  { id: 'released', label: 'Liberada' },
  { id: 'picking', label: 'Em separação' },
  { id: 'paused', label: 'Pausada' },
  { id: 'completed', label: 'Concluída' },
  { id: 'cancelled', label: 'Cancelada' }
]);

export const PICKING_WAVE_TYPES = Object.freeze([
  { id: 'wave', label: 'Onda' },
  { id: 'individual', label: 'Individual' },
  { id: 'batch', label: 'Lote' },
  { id: 'zone', label: 'Zona' }
]);

export function resolvePickingOperationalStatus(order = {}) {
  const meta = order.metadata || {};
  if (order.status === 'cancelled' || meta.op_status === 'cancelled') return 'cancelled';
  if (order.status === 'completed') return 'completed';
  if (meta.paused === true || meta.op_status === 'paused') return 'paused';
  if (order.status === 'picking') return 'picking';
  if (order.status === 'assigned' || meta.op_status === 'released') return 'released';
  return 'pending';
}

export function labelForPickingStatus(status) {
  const found = PICKING_ORDER_STATUSES.find((s) => s.id === status);
  return found?.label || status || '—';
}

function haystack(row) {
  return [
    row.order_number,
    row.wave_id,
    row.wave_type_label,
    row.operator,
    row.route_zone,
    row.warehouse,
    row.operational_status_label,
    row.priority
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function filterPickingRows(rows, { search = '', statusFilter = 'all', waveFilter = 'all' } = {}) {
  const q = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (statusFilter !== 'all' && row.operational_status !== statusFilter) return false;
    if (waveFilter !== 'all' && row.wave_id !== waveFilter) return false;
    if (!q) return true;
    return haystack(row).includes(q);
  });
}
