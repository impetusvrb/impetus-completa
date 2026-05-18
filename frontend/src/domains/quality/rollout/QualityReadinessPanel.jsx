import React from 'react';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

function CheckItem({ label, ok }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid var(--border-subtle)' }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
      <span style={{ ...mono, fontSize: 10, color: ok ? 'var(--green)' : 'var(--amber)' }}>{ok ? 'OK' : 'Revisar'}</span>
    </div>
  );
}

export default function QualityReadinessPanel({ pack }) {
  const r = pack?.readiness;
  if (!r) return null;
  const score = r.readiness_score ?? r.score;
  const checks = r.checks || r.criteria || {};
  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 10 }}>Prontidão industrial</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
        <div style={{ flex: '0 0 auto' }}>
          <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 2 }}>Score</div>
          <div style={{ fontSize: 28, fontFamily: 'var(--font-mono)', color: score > 0.7 ? 'var(--green)' : 'var(--amber)' }}>
            {score != null ? `${(score * 100).toFixed(0)}%` : '—'}
          </div>
        </div>
        {r.rollout_recommendation && (
          <div style={{ flex: '1 1 160px', padding: '6px 10px', background: 'var(--bg-tertiary)', borderRadius: 3, alignSelf: 'flex-start' }}>
            <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 2, fontSize: 9 }}>Recomendação</div>
            <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{r.rollout_recommendation}</div>
          </div>
        )}
      </div>
      {Object.keys(checks).length > 0 && (
        <div>
          <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 6 }}>Checks</div>
          {Object.entries(checks).map(([k, v]) => (
            <CheckItem key={k} label={k.replace(/_/g, ' ')} ok={v === true || v === 'pass' || (typeof v === 'number' && v > 0.5)} />
          ))}
        </div>
      )}
    </div>
  );
}
