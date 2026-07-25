import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

export default function TransferRoutePanel({ rows = [] }) {
  if (!rows.length) {
    return (
      <div className="transfer-route-panel">
        <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: 0 }}>Origem / Destino</h4>
        <p style={{ ...mono, fontSize: 10, color: 'var(--text-tertiary)', margin: '8px 0 0' }}>Sem rotas activas</p>
      </div>
    );
  }

  return (
    <div className="transfer-route-panel">
      <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '0 0 8px' }}>Origem → Destino</h4>
      <div className="transfer-route-grid">
        {rows.slice(0, 8).map((r) => (
          <div key={r.id} className="transfer-route-card">
            <span style={{ ...mono, fontSize: 9, color: 'var(--cyan)' }}>{r.order_number}</span>
            <span style={{ ...mono, fontSize: 10, color: 'var(--text-secondary)' }}>
              {r.from_warehouse} → {r.to_warehouse}
            </span>
            <span style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>
              {r.zone_from} / {r.bin_from} → {r.zone_to} / {r.bin_to}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
