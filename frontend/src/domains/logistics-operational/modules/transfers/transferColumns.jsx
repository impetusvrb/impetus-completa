/** OPM-006 — Colunas grid transferências internas. */
export const TRANSFER_GRID_COLUMNS = Object.freeze([
  { key: 'order_number', label: 'Ordem', sortable: true },
  { key: 'internal_type_label', label: 'Tipo', sortable: true },
  { key: 'from_warehouse', label: 'Origem', sortable: true },
  { key: 'to_warehouse', label: 'Destino', sortable: true },
  { key: 'zone_from', label: 'Zona orig.', sortable: false },
  { key: 'bin_from', label: 'Bin orig.', sortable: false },
  { key: 'operational_status_label', label: 'Status', sortable: true },
  { key: 'qty_total', label: 'Qtd', sortable: true },
  { key: 'operator', label: 'Operador', sortable: false },
  { key: 'priority', label: 'Prior.', sortable: true },
  { key: 'started_at', label: 'Início', sortable: false },
  { key: 'completed_at', label: 'Conclusão', sortable: false }
]);
