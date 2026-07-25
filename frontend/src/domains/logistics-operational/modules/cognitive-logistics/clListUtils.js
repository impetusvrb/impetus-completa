export const CL_PRIORITY_FILTERS = Object.freeze([
  { id: 'all', label: 'Todas prioridades' },
  { id: 'high', label: 'Alta' },
  { id: 'medium', label: 'Média' },
  { id: 'low', label: 'Baixa' }
]);

export const CL_MODULE_FILTERS = Object.freeze([
  { id: 'all', label: 'Todos módulos' },
  { id: 'receiving', label: 'Receiving' },
  { id: 'picking', label: 'Picking' },
  { id: 'shipping', label: 'Shipping' },
  { id: 'transfers', label: 'Transfer' },
  { id: 'warehouse_intelligence', label: 'Warehouse Intelligence' }
]);

function haystack(row) {
  return [row.title, row.type, row.modules, row.trace_source, row.impact].filter(Boolean).join(' ').toLowerCase();
}

export function filterClRecommendationRows(rows, { search = '', priorityFilter = 'all' } = {}) {
  const q = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (priorityFilter !== 'all' && row.priority !== priorityFilter) return false;
    if (!q) return true;
    return haystack(row).includes(q);
  });
}
