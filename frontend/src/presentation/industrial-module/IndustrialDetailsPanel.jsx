import React from 'react';
import { mono } from './industrialModuleTokens.js';

const TABS = ['Resumo', 'Histórico', 'Eventos', 'Auditoria', 'Timeline', 'IA'];

export default function IndustrialDetailsPanel({ open = false, row = null, onClose }) {
  if (!open) return null;
  return (
    <aside
      className="industrial-details-panel impetus-card"
      data-industrial-details-open={open}
      style={{
        marginTop: 12,
        padding: '1rem',
        borderRadius: 4,
        borderLeft: '3px solid var(--cyan)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <span style={{ ...mono, color: 'var(--cyan)' }}>Painel de detalhes</span>
        <button type="button" className="btn btn-ghost" style={{ borderRadius: 4, fontSize: 11 }} onClick={onClose}>
          Fechar
        </button>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {TABS.map((t) => (
          <span
            key={t}
            style={{
              ...mono,
              fontSize: 9,
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid var(--border-subtle)',
              color: t === 'Resumo' ? 'var(--cyan)' : 'var(--text-tertiary)'
            }}
          >
            {t}
          </span>
        ))}
      </div>
      {row ? (
        <pre style={{ fontSize: 11, color: 'var(--text-secondary)', overflow: 'auto', maxHeight: 200 }}>
          {JSON.stringify(row, null, 2)}
        </pre>
      ) : (
        <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>Seleccione um registo na grelha</p>
      )}
    </aside>
  );
}
