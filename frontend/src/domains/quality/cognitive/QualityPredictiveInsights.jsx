import React from 'react';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

export default function QualityPredictiveInsights({ pack }) {
  const risk = pack?.risk;
  if (!risk) return null;

  const score = risk.predictive_risk_score;
  const pct = score != null ? `${(score * 100).toFixed(1)}%` : '—';
  const color = score > 0.7 ? 'var(--red)' : score > 0.4 ? 'var(--amber)' : 'var(--green)';

  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Risco preditivo</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ flex: '1 1 160px' }}>
          <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 2 }}>Score</div>
          <div style={{ fontSize: 32, fontFamily: 'var(--font-mono)', color }}>{pct}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
            {score > 0.7 ? 'Crítico — ação imediata' : score > 0.4 ? 'Elevado — monitorar' : 'Normal — sem ação'}
          </div>
        </div>
        {risk.inputs && (
          <div style={{ flex: '2 1 240px', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {Object.entries(risk.inputs).slice(0, 4).map(([k, v]) => (
              <div key={k} style={{ flex: '1 1 100px', padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: 3, border: '1px solid var(--border-subtle)' }}>
                <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{k.replace(/_/g, ' ')}</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {typeof v === 'number' ? v.toFixed(4) : String(v)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
