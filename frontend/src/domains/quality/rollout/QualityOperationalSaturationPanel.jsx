import React from 'react';

export default function QualityOperationalSaturationPanel({ pack }) {
  const s = pack?.saturation;
  if (!s) return null;
  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Saturação / digest</div>
      <div style={{ fontSize: 13, color: s.saturated ? 'var(--amber)' : 'var(--green)' }}>{s.saturated ? 'Saturação — aplicar batching/digest assistivo' : 'Dentro do limiar'}</div>
      <pre style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)' }}>{JSON.stringify(s.suppression || {}, null, 2)}</pre>
    </div>
  );
}
