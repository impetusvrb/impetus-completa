import React from 'react';

export function EnterpriseTelemetryPressureWorkspace({ telemetry }) {
  const r = telemetry?.resilience;
  if (!r) return null;
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        Pressão telemétrica
      </h3>
      <p style={{ margin: 0, fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>
        Score {(Number(r.telemetry_pressure_score) * 100).toFixed(0)}%
      </p>
      <p style={{ margin: '6px 0 0', fontSize: 13, color: r.collapse_risk ? 'var(--amber)' : 'var(--green)' }}>
        {r.collapse_risk ? 'Risco de colapso — amostragem adaptativa' : 'Estável'}
      </p>
    </div>
  );
}
