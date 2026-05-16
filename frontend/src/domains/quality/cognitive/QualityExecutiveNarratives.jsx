import React from 'react';

export default function QualityExecutiveNarratives({ narrative }) {
  if (!narrative?.paragraphs?.length) return null;
  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Narrativa executiva</div>
      <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: '0 0 8px' }}>{narrative.headline}</p>
      {narrative.paragraphs.map((p, i) => (
        <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', margin: '6px 0' }}>
          {p}
        </p>
      ))}
    </div>
  );
}
