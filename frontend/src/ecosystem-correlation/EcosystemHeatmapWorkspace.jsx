import React from 'react';

export function EcosystemHeatmapWorkspace({ heatmap = {} }) {
  const entries = Object.entries(heatmap);
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        Heatmap cross-domain
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
        {entries.map(([k, v]) => (
          <div
            key={k}
            style={{
              padding: 8,
              borderRadius: 4,
              border: '1px solid var(--border-subtle)',
              background: `rgba(0, 212, 255, ${Number(v) * 0.35})`
            }}
          >
            <p style={{ margin: 0, fontSize: 10, textTransform: 'uppercase', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>{k}</p>
            <p style={{ margin: '4px 0 0', fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>{(Number(v) * 100).toFixed(0)}%</p>
          </div>
        ))}
      </div>
    </div>
  );
}
