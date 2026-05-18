import React from 'react';

export function EcosystemRiskCorrelationWorkspace({ riskMap = {} }) {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4 }}>
      <h3 style={{ margin: '0 0 12px', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
        Mapa de risco correlacionado
      </h3>
      <div style={{ display: 'flex', gap: 16, fontFamily: 'var(--font-mono)', fontSize: 14 }}>
        <span style={{ color: 'var(--red)' }}>Elevado: {riskMap.elevated ?? 0}</span>
        <span style={{ color: 'var(--amber)' }}>Moderado: {riskMap.moderate ?? 0}</span>
        <span style={{ color: 'var(--green)' }}>Baixo: {riskMap.low ?? 0}</span>
      </div>
    </div>
  );
}
