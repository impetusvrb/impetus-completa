/** OPM-005 — Estados operacionais outbound / expedição. */
export const SHIPPING_ORDER_STATUSES = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: 'awaiting_picking', label: 'Aguardando picking' },
  { id: 'ready', label: 'Pronta' },
  { id: 'inspecting', label: 'Em conferência' },
  { id: 'loading', label: 'Carregando' },
  { id: 'shipped', label: 'Expedida' },
  { id: 'cancelled', label: 'Cancelada' }
]);

export function resolveShippingOperationalStatus(order = {}) {
  const meta = order.metadata || {};
  if (order.status === 'cancelled' || meta.op_status === 'cancelled') return 'cancelled';
  if (order.status === 'shipped') return 'shipped';
  if (meta.loading === true || meta.op_status === 'loading') return 'loading';
  if (meta.inspecting === true || meta.op_status === 'inspecting') return 'inspecting';
  if (order.status === 'staged' || meta.op_status === 'ready') return 'ready';
  if (meta.awaiting_picking) return 'awaiting_picking';
  if (!meta.picking_order_id && order.status === 'open') return 'awaiting_picking';
  return meta.op_status || 'ready';
}

export function labelForShippingStatus(status) {
  const found = SHIPPING_ORDER_STATUSES.find((s) => s.id === status);
  return found?.label || status || '—';
}

function haystack(row) {
  return [
    row.order_number,
    row.carrier,
    row.load_id,
    row.vehicle,
    row.outbound_dock,
    row.warehouse,
    row.operational_status_label,
    row.picking_ref
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function filterShippingRows(rows, { search = '', statusFilter = 'all', carrierFilter = 'all' } = {}) {
  const q = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (statusFilter !== 'all' && row.operational_status !== statusFilter) return false;
    if (carrierFilter !== 'all' && row.carrier_id !== carrierFilter && row.carrier !== carrierFilter) return false;
    if (!q) return true;
    return haystack(row).includes(q);
  });
}
