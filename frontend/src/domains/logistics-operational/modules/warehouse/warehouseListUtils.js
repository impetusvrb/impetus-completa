export const WAREHOUSE_STATUS_FILTERS = Object.freeze([
  { id: 'all', label: 'Todos' },
  { id: 'active', label: 'Activos' },
  { id: 'inactive', label: 'Inactivos' },
  { id: 'maintenance', label: 'Manutenção' }
]);

export function filterWarehouses(rows, { search = '', statusFilter = 'all' } = {}) {
  const q = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (statusFilter !== 'all' && String(row.status || '').toLowerCase() !== statusFilter) {
      return false;
    }
    if (!q) return true;
    const hay = [row.code, row.name, row.warehouse_type, row.status, row.id]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

export function buildTimelineFromMovements(movements, warehouseId, limit = 12) {
  return movements
    .filter((m) => m.warehouse_id === warehouseId)
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, limit)
    .map((m) => ({
      id: m.id,
      label: `${m.movement_type || 'movimento'} · ${m.quantity ?? '—'} ${m.uom || ''} · ${formatTs(m.created_at)}`
    }));
}

function formatTs(v) {
  if (!v) return '—';
  try {
    return new Date(v).toLocaleString('pt-BR');
  } catch {
    return '—';
  }
}
