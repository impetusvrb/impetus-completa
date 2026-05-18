import React from 'react';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

export default function QualityAdoptionAnalytics({ pack }) {
  const a = pack?.adoption;
  if (!a) return null;
  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 10 }}>Adoção</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {[
          { label: 'Operadores ativos', value: a.active_operators },
          { label: 'Cobertura turno', value: a.shift_coverage != null ? `${(a.shift_coverage * 100).toFixed(0)}%` : null },
          { label: 'Taxa adoção', value: a.adoption_rate != null ? `${(a.adoption_rate * 100).toFixed(0)}%` : null, color: a.adoption_rate > 0.7 ? 'var(--green)' : 'var(--amber)' },
          { label: 'Abandono', value: a.abandonment_rate != null ? `${(a.abandonment_rate * 100).toFixed(0)}%` : null, color: a.abandonment_rate > 0.2 ? 'var(--amber)' : 'var(--green)' },
          { label: 'Interação cognitiva', value: a.cognitive_interaction_rate != null ? `${(a.cognitive_interaction_rate * 100).toFixed(0)}%` : null }
        ].filter(item => item.value != null).map(({ label, value, color }) => (
          <div key={label} style={{ flex: '1 1 110px', padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: 3, border: '1px solid var(--border-subtle)' }}>
            <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{label}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: color || 'var(--text-secondary)', marginTop: 2 }}>{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
