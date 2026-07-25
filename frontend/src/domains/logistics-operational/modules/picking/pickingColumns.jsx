/** OPM-004 — Colunas grid Order Fulfillment / Picking. */
export const PICKING_GRID_COLUMNS = Object.freeze([
  { key: 'order_number', label: 'Ordem' },
  { key: 'wave_id', label: 'Onda' },
  { key: 'wave_type_label', label: 'Tipo' },
  { key: 'operator', label: 'Operador' },
  { key: 'route_zone', label: 'Zona' },
  { key: 'warehouse', label: 'Armazém' },
  { key: 'priority', label: 'Prioridade' },
  { key: 'operational_status_label', label: 'Status' },
  { key: 'route_progress', label: 'Progresso rota' },
  { key: 'qty_picked', label: 'Qtd. separada' },
  { key: 'started_at', label: 'Início' }
]);
