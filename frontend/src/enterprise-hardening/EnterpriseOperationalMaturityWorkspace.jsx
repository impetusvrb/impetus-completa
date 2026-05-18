import React from 'react';

export function EnterpriseOperationalMaturityWorkspace({ maturity }) {
  const m = maturity?.ecosystem;
  if (!m) return null;
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        Maturidade enterprise
      </h3>
      <p style={{ margin: 0, fontFamily: 'var(--font-mono)', color: 'var(--green)', fontSize: 18 }}>
        {m.maturity_level}
      </p>
      <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>
        Score {(Number(m.maturity_score) * 100).toFixed(0)}% · industrial readiness: {m.industrial_readiness ? 'sim' : 'não'}
      </p>
    </div>
  );
}
