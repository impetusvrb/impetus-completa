import React from 'react';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

export default function QualityOperationalSaturationPanel({ pack }) {
  const s = pack?.saturation;
  if (!s) return null;
  const sup = s.suppression || {};
  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Saturação operacional</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: s.saturated && Object.keys(sup).length > 0 ? 10 : 0 }}>
        <div style={{ flex: '0 0 auto', padding: '6px 10px', background: s.saturated ? 'rgba(255,170,0,0.08)' : 'rgba(0,255,136,0.08)', borderRadius: 3, border: `1px solid ${s.saturated ? 'rgba(255,170,0,0.2)' : 'rgba(0,255,136,0.2)'}` }}>
          <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>Status</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: s.saturated ? 'var(--amber)' : 'var(--green)' }}>
            {s.saturated ? 'Saturado' : 'Normal'}
          </div>
        </div>
        {s.insights_per_hour != null && (
          <div style={{ flex: '0 0 auto', padding: '6px 10px', background: 'var(--bg-tertiary)', borderRadius: 3, border: '1px solid var(--border-subtle)' }}>
            <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>Insights/h</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--text-secondary)' }}>{s.insights_per_hour}</div>
          </div>
        )}
        {s.alerts_per_hour != null && (
          <div style={{ flex: '0 0 auto', padding: '6px 10px', background: 'var(--bg-tertiary)', borderRadius: 3, border: '1px solid var(--border-subtle)' }}>
            <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>Alertas/h</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: 'var(--text-secondary)' }}>{s.alerts_per_hour}</div>
          </div>
        )}
      </div>
      {s.saturated && Object.keys(sup).length > 0 && (
        <div>
          <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 6 }}>Supressão adaptativa</div>
          {Object.entries(sup).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{k.replace(/_/g, ' ')}</span>
              <span style={{ ...mono, fontSize: 10, color: v ? 'var(--amber)' : 'var(--green)' }}>{String(v)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
