import React from 'react';

export default function QualityAdoptionAnalytics({ pack }) {
  const a = pack?.adoption;
  if (!a) return null;
  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Adoção</div>
      <pre style={{ fontSize: 11, color: 'var(--text-secondary)', margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(a, null, 2)}</pre>
    </div>
  );
}
