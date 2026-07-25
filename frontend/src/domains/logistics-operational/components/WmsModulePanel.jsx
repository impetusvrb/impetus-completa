import React from 'react';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
};

export default function WmsModulePanel({ title, subtitle, loading, error, count, children }) {
  return (
    <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, background: 'var(--bg-panel)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 16, letterSpacing: '0.04em', textTransform: 'uppercase' }}>{title}</h2>
          {subtitle && (
            <p style={{ ...mono, color: 'var(--cyan)', margin: '4px 0 0' }}>{subtitle}</p>
          )}
        </div>
        {count != null && (
          <span style={{ ...mono, color: 'var(--text-tertiary)' }}>{count} registos</span>
        )}
      </div>
      {loading && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>A carregar via WMS-003 v1…</p>
      )}
      {error && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--red)' }}>{error}</p>
      )}
      {children}
    </div>
  );
}

export function WmsDataTable({ rows = [], columns = [] }) {
  if (!rows.length) {
    return (
      <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-tertiary)' }}>
        Sem dados — API v1 respondeu vazio.
      </p>
    );
  }
  return (
    <div style={{ overflow: 'auto' }}>
      <table className="data-table" style={{ width: '100%', fontSize: 12 }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--text-tertiary)' }}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 50).map((row, i) => (
            <tr key={row.id || i}>
              {columns.map((c) => (
                <td key={c.key} style={{ padding: '6px 8px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  {c.render ? c.render(row) : String(row[c.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
