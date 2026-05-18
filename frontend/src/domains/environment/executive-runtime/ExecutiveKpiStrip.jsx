import React from 'react';

export function ExecutiveKpiStrip({ items = [] }) {
  if (!items.length) return null;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
        gap: 8,
        marginBottom: 12
      }}
    >
      {items.map((it) => (
        <div
          key={it.label}
          className="impetus-card"
          style={{ padding: '10px 12px', borderRadius: 4, fontFamily: 'var(--font-mono)', fontSize: 11 }}
        >
          <div style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{it.label}</div>
          <div style={{ color: it.color || 'var(--cyan)', fontSize: 18, marginTop: 4 }}>{it.value}</div>
        </div>
      ))}
    </div>
  );
}
