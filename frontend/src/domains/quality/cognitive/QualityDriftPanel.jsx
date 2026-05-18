import React from 'react';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em', textTransform: 'uppercase' };

function DriftIndicator({ label, value, threshold, unit }) {
  const exceeded = threshold != null && value > threshold;
  return (
    <div style={{ flex: '1 1 140px' }}>
      <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', color: exceeded ? 'var(--red)' : 'var(--green)' }}>
        {value != null ? (typeof value === 'number' ? value.toFixed(3) : value) : '—'}
        {unit && <span style={{ fontSize: 11, marginLeft: 3, color: 'var(--text-secondary)' }}>{unit}</span>}
      </div>
    </div>
  );
}

export default function QualityDriftPanel({ drift }) {
  if (!drift || !drift.ok) return null;
  const severity = drift.drift_severity;
  const severityColor =
    severity === 'high' || severity === 'critical' ? 'var(--red)' :
    severity === 'medium' ? 'var(--amber)' : 'var(--green)';

  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ ...mono, color: 'var(--cyan)', marginBottom: 8 }}>Drift preditivo</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 10 }}>
        <div style={{ flex: '1 1 160px' }}>
          <div style={{ ...mono, color: 'var(--text-tertiary)', marginBottom: 2 }}>Severidade</div>
          <div style={{ fontSize: 18, fontFamily: 'var(--font-mono)', color: severityColor, textTransform: 'uppercase' }}>
            {severity || '—'}
          </div>
        </div>
        <DriftIndicator label="Confiança" value={drift.drift_confidence != null ? drift.drift_confidence * 100 : null} unit="%" />
        {drift.drift_magnitude != null && <DriftIndicator label="Magnitude" value={drift.drift_magnitude} />}
        {drift.trend_slope != null && <DriftIndicator label="Inclinação" value={drift.trend_slope} threshold={0.5} />}
      </div>

      {drift.explainability && Object.keys(drift.explainability).length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {Object.entries(drift.explainability).slice(0, 4).map(([k, v]) => (
            <div key={k} style={{ flex: '1 1 120px', padding: '6px 8px', background: 'var(--bg-tertiary)', borderRadius: 3, border: '1px solid var(--border-subtle)' }}>
              <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{k.replace(/_/g, ' ')}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', marginTop: 2 }}>
                {typeof v === 'number' ? v.toFixed(3) : String(v)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
