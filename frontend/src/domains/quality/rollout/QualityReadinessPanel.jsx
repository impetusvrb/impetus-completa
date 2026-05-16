import React from 'react';

export default function QualityReadinessPanel({ pack }) {
  const r = pack?.readiness;
  if (!r) return null;
  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Readiness industrial</div>
      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>Score: {(r.readiness_score * 100).toFixed(1)}% — {r.rollout_recommendation}</div>
      <pre style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)', maxHeight: 180, overflow: 'auto' }}>{JSON.stringify(r.checks || {}, null, 2)}</pre>
    </div>
  );
}
