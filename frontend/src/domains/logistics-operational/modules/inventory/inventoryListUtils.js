export const INVENTORY_STATUS_FILTERS = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: 'disponível', label: 'Disponível' },
  { id: 'reservado', label: 'Reservado' },
  { id: 'bloqueado', label: 'Bloqueado' },
  { id: 'quarentena', label: 'Quarentena' },
  { id: 'expirado', label: 'Expirado' }
]);

export const INVENTORY_TIMELINE_PERIODS = Object.freeze([
  { id: '7', label: '7 dias', days: 7 },
  { id: '30', label: '30 dias', days: 30 },
  { id: '90', label: '90 dias', days: 90 },
  { id: 'all', label: 'Tudo', days: null }
]);

function haystack(row) {
  return [
    row.item_code,
    row.sku,
    row.product,
    row.description,
    row.lot,
    row.serial,
    row.address,
    row.warehouse,
    row.status
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export function filterInventoryRows(rows, { search = '', statusFilter = 'all' } = {}) {
  const q = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (statusFilter !== 'all') {
      const st = String(row.status || '').toLowerCase();
      if (st !== statusFilter) return false;
    }
    if (!q) return true;
    return haystack(row).includes(q);
  });
}
