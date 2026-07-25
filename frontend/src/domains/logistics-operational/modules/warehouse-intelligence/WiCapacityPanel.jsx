import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

export default function WiCapacityPanel({ capacity = [], onAnalyze }) {
  if (!capacity.length) return null;
  return (
    <div className="wi-capacity-panel">
      <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '0 0 8px' }}>Capacity analytics</h4>
      <div className="wi-panel-grid">
        {capacity.map((c) => (
          <button
            key={c.warehouse_id}
            type="button"
            className={`wi-panel-card${c.critical ? ' wi-panel-card--critical' : ''}`}
            onClick={() => onAnalyze?.(c.warehouse_id)}
            style={{ cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ ...mono, fontSize: 9, color: 'var(--cyan)' }}>{c.warehouse}</span>
            <span style={{ ...mono, fontSize: 12 }}>{c.occupancy_pct != null ? `${c.occupancy_pct}%` : '—'} · {c.trend}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
