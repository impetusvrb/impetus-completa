import React from 'react';

export function EcosystemOperationalImpactWorkspace({ impacts = [] }) {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        Impactos operacionais
      </h3>
      <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)', fontSize: 13 }}>
        {impacts.map((imp) => (
          <li key={imp.domain}>
            <strong style={{ color: 'var(--cyan)' }}>{imp.domain}</strong> — score {(Number(imp.score) * 100).toFixed(0)}%
          </li>
        ))}
      </ul>
    </div>
  );
}
