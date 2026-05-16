import React from 'react';

export default function QualityRecommendationPanel({ recommendations }) {
  const list = recommendations?.recommendations || [];
  if (!list.length) return null;
  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Recomendações (sem execução)</div>
      <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-primary)', fontSize: 13 }}>
        {list.map((r) => (
          <li key={r.kind} style={{ marginBottom: 8 }}>
            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>{r.kind}</span> — {r.rationale}
          </li>
        ))}
      </ul>
    </div>
  );
}
