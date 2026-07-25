import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

export default function InventoryDetailsPanel({ open, row, onClose }) {
  if (!open || !row) return null;

  const fields = [
    ['Código', row.item_code],
    ['Produto', row.product],
    ['Lote', row.lot],
    ['Série', row.serial],
    ['Quantidade', `${row.quantity ?? '—'} ${row.uom || ''}`.trim()],
    ['Reservado', row.reserved_quantity ?? 0],
    ['Endereço', row.address],
    ['Armazém', row.warehouse],
    ['Status', row.status],
    ['Última movimentação', row.last_movement_at]
  ];

  return (
    <aside
      className="inventory-details-panel impetus-card"
      role="region"
      aria-label="Detalhes do item de inventário"
      style={{ padding: '1rem', borderRadius: 4, borderLeft: '3px solid var(--cyan)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ ...mono, color: 'var(--cyan)' }}>Inventário · {row.item_code}</span>
        <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, fontSize: 11 }} onClick={onClose}>
          Fechar
        </button>
      </div>
      <dl className="inventory-details-grid">
        {fields.map(([label, value]) => (
          <div key={label}>
            <dt style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{label}</dt>
            <dd style={{ margin: '2px 0 0', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>{value ?? '—'}</dd>
          </div>
        ))}
      </dl>
    </aside>
  );
}
