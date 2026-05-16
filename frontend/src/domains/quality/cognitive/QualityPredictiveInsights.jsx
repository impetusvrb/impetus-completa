import React from 'react';

export default function QualityPredictiveInsights({ pack }) {
  const risk = pack?.risk;
  if (!risk) return null;
  const score = risk.predictive_risk_score != null ? (risk.predictive_risk_score * 100).toFixed(1) : '—';
  return (
    <div className="impetus-card" style={{ padding: 12, borderRadius: 4 }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--cyan)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Risco preditivo (assistivo)
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: 'var(--amber)' }}>{score}%</div>
      <pre style={{ marginTop: 8, fontSize: 11, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{JSON.stringify(risk.inputs || {}, null, 2)}</pre>
    </div>
  );
}
