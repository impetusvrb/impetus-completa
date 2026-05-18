import React from 'react';

export function EcosystemExecutiveNarrativeWorkspace({ narratives = [] }) {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        Narrativas executivas (assistivas)
      </h3>
      <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 13 }}>
        {narratives.slice(0, 8).map((n, i) => (
          <li key={i}>{n.text || String(n)}</li>
        ))}
      </ul>
      {narratives.length === 0 && <p style={{ margin: 0, color: 'var(--text-tertiary)', fontSize: 13 }}>Sem narrativas — execute correlação.</p>}
    </div>
  );
}
