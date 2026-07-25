import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

export default function WiAnalyticsMetricsPanel({ performance }) {
  if (!performance) return null;
  return (
    <section className="wi-performance-panel" data-wi-performance="operational">
      <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '0 0 8px' }}>Warehouse performance</h4>
      <div className="wi-panel-grid">
        {(performance.operatorProductivity || []).slice(0, 4).map((o) => (
          <div key={o.operator} className="wi-panel-card">
            <span style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>Operador</span>
            <span style={{ ...mono, fontSize: 12 }}>{o.operator} · {o.count}</span>
          </div>
        ))}
        <div className="wi-panel-card">
          <span style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>Replenishment</span>
          <span style={{ ...mono, fontSize: 12 }}>{performance.replenishmentEfficiency}</span>
        </div>
        <div className="wi-panel-card">
          <span style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>Cross-dock</span>
          <span style={{ ...mono, fontSize: 12 }}>{performance.crossDockEfficiency}</span>
        </div>
      </div>
    </section>
  );
}
