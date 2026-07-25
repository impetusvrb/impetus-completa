/** OPM-002A — Colunas do grid operacional de estoque. */
export const INVENTORY_STOCK_COLUMNS = Object.freeze([
  { key: 'item_code', label: 'Código' },
  { key: 'product', label: 'Produto' },
  { key: 'description', label: 'Descrição' },
  { key: 'lot', label: 'Lote' },
  { key: 'serial', label: 'Série' },
  { key: 'quantity', label: 'Quantidade' },
  { key: 'uom', label: 'Unidade' },
  { key: 'address', label: 'Endereço' },
  { key: 'warehouse', label: 'Armazém' },
  { key: 'status', label: 'Status' },
  { key: 'last_movement_at', label: 'Última movimentação' }
]);

export function formatGridCell(row, key) {
  if (key === 'last_movement_at') {
    const v = row[key];
    if (!v) return '—';
    try {
      return new Date(v).toLocaleString('pt-BR');
    } catch {
      return '—';
    }
  }
  if (key === 'quantity') {
    const q = row.quantity;
    return q != null ? String(q) : '—';
  }
  return row[key] ?? '—';
}
