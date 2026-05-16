import React from 'react';

export default function QualityDriftPanel({ drift }) {
  if (!drift || !drift.ok) return null;
  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Drift preditivo</div>
      <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>
        Severidade: <span style={{ color: 'var(--green)' }}>{drift.drift_severity}</span> · Confiança: {(drift.drift_confidence * 100).toFixed(0)}%
      </div>
      <pre style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)', maxHeight: 160, overflow: 'auto' }}>{JSON.stringify(drift.explainability || {}, null, 2)}</pre>
    </div>
  );
}
