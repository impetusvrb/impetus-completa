import React from 'react';

export default function QualityMaturityPanel({ pack }) {
  const m = pack?.maturity;
  if (!m) return null;
  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Maturidade operacional</div>
      <div style={{ fontSize: 14, color: 'var(--green)' }}>
        {m.maturity_level} · {(m.maturity_score * 100).toFixed(1)}%
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>Pontos fracos: {(m.weak_points || []).join(', ') || '—'}</p>
    </div>
  );
}
