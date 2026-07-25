import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

export default function ShippingLoadingPanel({ docks = [] }) {
  if (!docks.length) return null;

  return (
    <section className="shipping-loading-panel" data-shipping-loading="operational">
      <h3 style={{ ...mono, color: 'var(--cyan)', margin: 0, fontSize: 11 }}>Gestão de carregamento · docas saída</h3>
      <div className="shipping-dock-grid">
        {docks.map((d) => (
          <div key={d.id} className={`shipping-dock-card shipping-dock-card--${d.status}`}>
            <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{d.code}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: d.status === 'occupied' ? 'var(--amber)' : 'var(--green)' }}>{d.statusLabel}</div>
            <div style={{ ...mono, fontSize: 9, color: 'var(--text-secondary)', marginTop: 4 }}>Ordem: {d.order_number}</div>
            <div style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>Veículo: {d.vehicle} · {d.carrier}</div>
            <div style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>Operador: {d.operator} · {d.dwell_minutes} min</div>
          </div>
        ))}
      </div>
    </section>
  );
}
