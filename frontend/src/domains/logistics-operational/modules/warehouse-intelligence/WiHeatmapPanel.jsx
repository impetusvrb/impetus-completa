import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

export default function WiHeatmapPanel({ heatmaps, onView }) {
  if (!heatmaps) return null;
  return (
    <div className="wi-heatmap-panel">
      <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '0 0 8px' }}>Heatmaps operacionais</h4>
      <div className="wi-panel-grid">
        {(heatmaps.zones || []).slice(0, 6).map((z) => (
          <button
            key={z.id}
            type="button"
            className="wi-panel-card"
            onClick={() => onView?.('zone', z.id)}
            style={{ cursor: 'pointer', textAlign: 'left' }}
          >
            <span style={{ ...mono, fontSize: 9, color: 'var(--cyan)' }}>Zona · {z.id}</span>
            <span style={{ ...mono, fontSize: 12 }}>{z.count} mov.</span>
          </button>
        ))}
        {(heatmaps.bins || []).slice(0, 4).map((b) => (
          <div key={b.id} className="wi-panel-card">
            <span style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>Bin · {String(b.id).slice(0, 12)}</span>
            <span style={{ ...mono, fontSize: 12 }}>{b.count}</span>
          </div>
        ))}
      </div>
      {heatmaps.preparedForGraphicalMap && (
        <p style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)', margin: '8px 0 0' }}>Preparado integração mapas gráficos · OPM-008</p>
      )}
    </div>
  );
}
