import React, { useMemo } from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';
import { groupMovementsByType } from './warehouseTimelineUtils.js';

function MovementList({ title, items, color }) {
  return (
    <div style={{ flex: '1 1 160px' }}>
      <h5 style={{ ...mono, color, margin: '0 0 6px', fontSize: 10 }}>{title} ({items.length})</h5>
      {items.length === 0 ? (
        <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>Sem registos</p>
      ) : (
        <ul style={{ margin: 0, paddingLeft: 14, fontSize: 11, color: 'var(--text-secondary)' }}>
          {items.slice(0, 8).map((m) => (
            <li key={m.id} style={{ fontFamily: 'var(--font-mono)', marginBottom: 4 }}>
              {m.movement_type} · {m.quantity ?? '—'} {m.uom || ''}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function WarehouseMovementsPanel({ movements, warehouseId }) {
  const grouped = useMemo(
    () => groupMovementsByType(movements, warehouseId),
    [movements, warehouseId]
  );

  return (
    <section className="warehouse-movements-panel" aria-label="Movimentações">
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <MovementList title="Entradas" items={grouped.entradas} color="var(--green)" />
        <MovementList title="Saídas" items={grouped.saidas} color="var(--red)" />
        <MovementList title="Movimentações" items={grouped.movimentacoes} color="var(--cyan)" />
      </div>
    </section>
  );
}
