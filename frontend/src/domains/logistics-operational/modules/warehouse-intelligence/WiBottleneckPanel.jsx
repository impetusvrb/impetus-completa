import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

export default function WiBottleneckPanel({ bottlenecks = [] }) {
  if (!bottlenecks.length) {
    return (
      <div className="wi-bottleneck-panel">
        <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: 0 }}>Gargalos operacionais</h4>
        <p style={{ ...mono, fontSize: 10, color: 'var(--green)', margin: '8px 0 0' }}>Nenhum gargalo detectado</p>
      </div>
    );
  }
  return (
    <div className="wi-bottleneck-panel">
      <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '0 0 8px' }}>Gargalos operacionais</h4>
      <div className="wi-panel-grid">
        {bottlenecks.map((b) => (
          <div key={b.id} className={`wi-panel-card wi-panel-card--${b.severity}`}>
            <span style={{ ...mono, fontSize: 9, color: 'var(--amber)' }}>{b.moduleLabel}</span>
            <span style={{ ...mono, fontSize: 12 }}>{b.count} · {b.hint}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
