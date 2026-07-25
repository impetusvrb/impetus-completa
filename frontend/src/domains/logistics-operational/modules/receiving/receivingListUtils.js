/** OPM-003 — Estados operacionais ASN / recebimento. */
export const RECEIVING_ASN_STATUSES = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: 'planned', label: 'Previsto' },
  { id: 'in_transit', label: 'Em trânsito' },
  { id: 'received', label: 'Recebido' },
  { id: 'inspecting', label: 'Em conferência' },
  { id: 'completed', label: 'Finalizado' },
  { id: 'cancelled', label: 'Cancelado' }
]);

export const RECEIVING_TIMELINE_PERIODS = Object.freeze([
  { id: '7', label: '7 dias', days: 7 },
  { id: '30', label: '30 dias', days: 30 },
  { id: '90', label: '90 dias', days: 90 },
  { id: 'all', label: 'Tudo', days: null }
]);

export function resolveReceivingOperationalStatus(order = {}) {
  const meta = order.metadata || {};
  if (order.status === 'cancelled' || meta.asn_status === 'cancelled') return 'cancelled';
  if (order.status === 'completed' || meta.asn_status === 'completed') return 'completed';
  if (meta.asn_status) return meta.asn_status;
  if (order.status === 'in_progress') return 'inspecting';
  if (order.status === 'open') return meta.in_transit ? 'in_transit' : 'planned';
  return order.status || 'planned';
}

function haystack(row) {
  return [
    row.order_number,
    row.asn_number,
    row.supplier,
    row.po_number,
    row.dock,
    row.warehouse,
    row.operational_status_label
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function filterReceivingRows(rows, { search = '', statusFilter = 'all' } = {}) {
  const q = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (statusFilter !== 'all' && row.operational_status !== statusFilter) return false;
    if (!q) return true;
    return haystack(row).includes(q);
  });
}

export function labelForOperationalStatus(status) {
  const found = RECEIVING_ASN_STATUSES.find((s) => s.id === status);
  return found?.label || status || '—';
}
