/** OPM-005 — Colunas grid outbound / expedição. */
export const SHIPPING_GRID_COLUMNS = Object.freeze([
  { key: 'order_number', label: 'Ordem' },
  { key: 'carrier', label: 'Transportadora' },
  { key: 'load_id', label: 'Carga' },
  { key: 'vehicle', label: 'Veículo' },
  { key: 'outbound_dock', label: 'Doca saída' },
  { key: 'warehouse', label: 'Armazém' },
  { key: 'picking_ref', label: 'Ref. picking' },
  { key: 'operational_status_label', label: 'Status' },
  { key: 'volume_count', label: 'Volumes' },
  { key: 'load_occupancy', label: 'Ocupação' },
  { key: 'operator', label: 'Operador' }
]);
