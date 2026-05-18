import React from 'react';

export function EnterpriseResilienceWorkspace({ resilience }) {
  if (!resilience) return null;
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        Resiliência runtime
      </h3>
      <p style={{ margin: 0, fontFamily: 'var(--font-mono)', color: 'var(--cyan)', fontSize: 16 }}>
        {(resilience.score * 100).toFixed(0)}% · {resilience.checks_passed}/6 checks
      </p>
      <p style={{ margin: '6px 0 0', color: 'var(--text-secondary)', fontSize: 13 }}>
        {resilience.resilient ? 'Resiliente' : 'Revisar hardening'}
      </p>
    </div>
  );
}
