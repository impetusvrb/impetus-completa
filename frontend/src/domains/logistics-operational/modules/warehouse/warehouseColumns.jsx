export const WAREHOUSE_FOUNDATION_COLUMNS = [
  { key: 'code', label: 'Código' },
  { key: 'name', label: 'Nome' },
  {
    key: 'warehouse_type',
    label: 'Tipo',
    render: (r) => String(r.warehouse_type || '—').toUpperCase()
  },
  {
    key: 'status',
    label: 'Status',
    render: (r) => String(r.status || '—')
  }
];
