export const WI_DOMAIN_FILTERS = Object.freeze([
  { id: 'all', label: 'Todos domínios' },
  { id: 'receiving', label: 'Receiving' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'transfer', label: 'Transfer' },
  { id: 'picking', label: 'Picking' },
  { id: 'shipping', label: 'Shipping' }
]);

export const WI_PRIORITY_FILTERS = Object.freeze([
  { id: 'all', label: 'Todas prioridades' },
  { id: 'high', label: 'Alta' },
  { id: 'medium', label: 'Média' },
  { id: 'low', label: 'Baixa' }
]);

function haystack(row) {
  return [row.title, row.message, row.type, row.trace_source].filter(Boolean).join(' ').toLowerCase();
}

export function filterWiRecommendationRows(rows, { search = '', priorityFilter = 'all' } = {}) {
  const q = search.trim().toLowerCase();
  return rows.filter((row) => {
    if (priorityFilter !== 'all' && row.priority !== priorityFilter) return false;
    if (!q) return true;
    return haystack(row).includes(q);
  });
}
