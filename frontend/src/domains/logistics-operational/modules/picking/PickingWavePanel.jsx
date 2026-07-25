import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

export default function PickingWavePanel({ waves = [] }) {
  if (!waves.length) return null;

  return (
    <section className="picking-wave-panel" data-picking-waves="operational">
      <h3 style={{ ...mono, color: 'var(--cyan)', margin: 0, fontSize: 11 }}>Ondas de separação · order fulfillment</h3>
      <div className="picking-wave-grid">
        {waves.slice(0, 8).map((w) => (
          <div key={w.id} className="picking-wave-card">
            <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{w.id}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cyan)' }}>{w.typeLabel}</div>
            <div style={{ ...mono, fontSize: 9, color: 'var(--text-secondary)', marginTop: 4 }}>
              {w.orders.length} ordens · {w.picking} activas · {w.completed} concluídas
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
