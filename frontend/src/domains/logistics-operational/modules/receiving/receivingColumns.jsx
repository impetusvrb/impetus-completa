/** OPM-003 — Colunas do grid operacional de recebimento. */
export const RECEIVING_GRID_COLUMNS = Object.freeze([
  { key: 'order_number', label: 'Documento' },
  { key: 'asn_number', label: 'ASN' },
  { key: 'supplier', label: 'Fornecedor' },
  { key: 'po_number', label: 'Pedido compra' },
  { key: 'dock', label: 'Doca' },
  { key: 'warehouse', label: 'Armazém' },
  { key: 'operational_status_label', label: 'Status' },
  { key: 'qty_expected', label: 'Qtd. prevista' },
  { key: 'qty_received', label: 'Qtd. recebida' },
  { key: 'expected_at', label: 'Previsão' },
  { key: 'last_event_at', label: 'Último evento' }
]);
