/**
 * INC-042 — Shell partilhado dos hubs logistics_native (Baseline UI v1.0).
 */
import React from 'react';
import { Link } from 'react-router-dom';

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

/**
 * @param {{ title: string, hubKey: string, view: object }} props
 */
export default function LogisticsHubShell({ title, hubKey, view }) {
  const state = view?.state || 'INSUFFICIENT_DATA';
  const meta = STATE_COPY[state] || STATE_COPY.INSUFFICIENT_DATA;
  const route = view?.route;

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
          {state === 'NOT_IMPLEMENTED'
            ? 'Funcionalidade ainda não disponível neste tenant.'
            : 'Aguardando sinais operacionais do runtime logistics_native.'}
        </p>
      )}

      {view.binding_ratio != null ? (
        <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10, marginBottom: 8 }}>
          binding {Math.round(view.binding_ratio * 1000) / 1000} · {hubKey}
        </div>
      ) : null}

      {route && state !== 'NOT_IMPLEMENTED' ? (
        <Link to={route} className="btn btn-ghost" style={{ minHeight: 32, borderRadius: 4, fontSize: 11 }}>
          Abrir módulo
        </Link>
      ) : null}
    </div>
  );
}