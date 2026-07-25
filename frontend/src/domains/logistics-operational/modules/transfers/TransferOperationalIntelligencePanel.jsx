import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

export default function TransferOperationalIntelligencePanel({ intelligence }) {
  if (!intelligence) return null;

  return (
    <div className="transfer-intelligence-panel">
      <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '0 0 8px' }}>Inteligência operacional interna</h4>
      <div className="transfer-intel-grid">
        {intelligence.congestionHint && (
          <div className="transfer-intel-card transfer-intel-card--warn">
            <span style={{ ...mono, fontSize: 9, color: 'var(--amber)' }}>Congestionamento</span>
            <span style={{ ...mono, fontSize: 11 }}>{intelligence.congestionHint}</span>
          </div>
        )}
        <div className="transfer-intel-card">
          <span style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>Cross-dock activos</span>
          <span style={{ ...mono, fontSize: 14, color: 'var(--cyan)' }}>{intelligence.crossDockActive}</span>
        </div>
        <div className="transfer-intel-card">
          <span style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>Recorrentes</span>
          <span style={{ ...mono, fontSize: 14, color: 'var(--text-primary)' }}>{intelligence.recurrent}</span>
        </div>
        {(intelligence.topZones || []).slice(0, 3).map((z) => (
          <div key={z.route} className="transfer-intel-card">
            <span style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>Rota zona</span>
            <span style={{ ...mono, fontSize: 11 }}>{z.route} ({z.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
