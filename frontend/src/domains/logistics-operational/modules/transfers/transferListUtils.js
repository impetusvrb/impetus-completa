/**
 * OPM-006 — Tipos de movimentação interna (OPM-GOV-001 activados).
 * Camada transversal — não altera posse nem quantidade de estoque.
 */
export const TRANSFER_INTERNAL_TYPES = Object.freeze([
  { id: 'transfer', label: 'Transferência', description: 'Entre armazéns' },
  { id: 'relocation', label: 'Relocation', description: 'Entre posições (bins/endereços)' },
  { id: 'replenishment', label: 'Replenishment', description: 'Reposição picking' },
  { id: 'crossDock', label: 'Cross-Dock', description: 'Recebimento → expedição directo' }
]);

/** OPM-006 — Estados operacionais transferência interna. */
export const TRANSFER_ORDER_STATUSES = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: 'planned', label: 'Planejada' },
  { id: 'released', label: 'Liberada' },
  { id: 'executing', label: 'Em execução' },
  { id: 'paused', label: 'Pausada' },
  { id: 'completed', label: 'Concluída' },
  { id: 'cancelled', label: 'Cancelada' }
]);

export const TRANSFER_TYPE_FILTERS = Object.freeze([
  { id: 'all', label: 'Todos tipos' },
  ...TRANSFER_INTERNAL_TYPES.map((t) => ({ id: t.id, label: t.label }))
]);

export function resolveTransferOperationalStatus(order = {}) {
  const meta = order.metadata || {};
  if (order.status === 'cancelled' || meta.op_status === 'cancelled') return 'cancelled';
  if (order.status === 'received' || meta.op_status === 'completed') return 'completed';
  if (meta.paused === true || meta.op_status === 'paused') return 'paused';
  if (order.status === 'in_transit' || meta.executing === true || meta.op_status === 'executing') return 'executing';
  if (meta.op_status === 'released' || meta.released === true) return 'released';
  return 'planned';
}

export function resolveInternalMovementType(order = {}) {
  const meta = order.metadata || {};
  const t = meta.internal_movement_type || meta.movement_type || 'transfer';
  return TRANSFER_INTERNAL_TYPES.some((x) => x.id === t) ? t : 'transfer';
}

export function labelForTransferStatus(status) {
  return TRANSFER_ORDER_STATUSES.find((s) => s.id === status)?.label || status || '—';
}

export function labelForInternalType(type) {
  return TRANSFER_INTERNAL_TYPES.find((t) => t.id === type)?.label || type || '—';
}

function haystack(row) {
  return [
    row.order_number,
    row.from_warehouse,
    row.to_warehouse,
    row.internal_type_label,
    row.zone_from,
    row.zone_to,
    row.bin_from,
    row.bin_to,
    row.operational_status_label,
    row.operator
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function filterTransferRows(rows, { search = '', statusFilter = 'all', typeFilter = 'all' } = {}) {
  const q = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (statusFilter !== 'all' && row.operational_status !== statusFilter) return false;
    if (typeFilter !== 'all' && row.internal_type !== typeFilter) return false;
    if (!q) return true;
    return haystack(row).includes(q);
  });
}
