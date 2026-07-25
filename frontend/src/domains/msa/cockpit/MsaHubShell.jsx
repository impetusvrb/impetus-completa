/**
 * GF-011 — Shell partilhado dos hubs msa_native.
 */
import React from 'react';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
};

const STATE_COPY = {
  REAL_DATA: { label: 'Dados reais', color: 'var(--green)' },
  INSUFFICIENT_DATA: { label: 'Sem dados suficientes', color: 'var(--amber)' },
  NOT_IMPLEMENTED: { label: 'Módulo em preparação', color: 'var(--text-tertiary)' }
};

export default function MsaHubShell({ title, hubKey, view }) {
  const state = view?.state || 'INSUFFICIENT_DATA';
  const meta = STATE_COPY[state] || STATE_COPY.INSUFFICIENT_DATA;

  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, minHeight: 120 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 10 }}>
        <span style={{ ...mono, color: 'var(--cyan)' }}>{title}</span>
        <span style={{ ...mono, color: meta.color, fontSize: 10 }}>{meta.label}</span>
      </div>

      {state === 'REAL_DATA' && view.metrics?.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {view.metrics.slice(0, 4).map((m) => (
            <div key={m.label} style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
              <span style={{ ...mono, color: 'var(--text-tertiary)', marginRight: 6 }}>{m.label}</span>
              {m.value}
            </div>
          ))}
        </div>
      ) : (
        <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          Sem dados suficientes para este hub MSA neste tenant.
        </p>
      )}

      {view.binding_ratio != null ? (
        <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, marginBottom: 8 }}>
          binding {Math.round(view.binding_ratio * 1000) / 1000} · {hubKey}
        </div>
      ) : null}
    </div>
  );
}
