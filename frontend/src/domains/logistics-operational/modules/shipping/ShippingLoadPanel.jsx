import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

export default function ShippingLoadPanel({ loads = [] }) {
  if (!loads.length) return null;

  return (
    <section className="shipping-load-panel" data-shipping-loads="consolidation">
      <h3 style={{ ...mono, color: 'var(--cyan)', margin: 0, fontSize: 11 }}>Consolidação de carga · outbound</h3>
      <div className="shipping-load-grid">
        {loads.slice(0, 8).map((l) => (
          <div key={l.id} className="shipping-load-card">
            <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{l.id}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--cyan)' }}>{l.carrier}</div>
            <div style={{ ...mono, fontSize: 9, color: 'var(--text-secondary)', marginTop: 4 }}>
              {l.orders.length} ordens · {l.volumes} vol · {l.pallets} pallets · {l.containers} containers
            </div>
            <div style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>
              Veículo: {l.vehicle} · Ocupação: {l.occupancyPct != null ? `${l.occupancyPct}%` : '—'}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
