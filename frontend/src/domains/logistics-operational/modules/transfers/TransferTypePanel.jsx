import React from 'react';
import { mono } from '../../../../presentation/industrial-module/industrialModuleTokens.js';

export default function TransferTypePanel({ typePanels = [] }) {
  return (
    <div className="transfer-type-panel">
      <h4 style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, margin: '0 0 8px' }}>Tipos movimentação interna</h4>
      <div className="transfer-type-grid">
        {typePanels.map((t) => (
          <div key={t.id} className={`transfer-type-card${t.active ? ' transfer-type-card--active' : ''}`}>
            <span style={{ ...mono, fontSize: 9, color: 'var(--cyan)' }}>{t.label}</span>
            <span style={{ ...mono, fontSize: 11, color: 'var(--text-primary)' }}>{t.active} activas</span>
            <span style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>{t.count} total · {t.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
