/**
 * FIN-EVOLVE-2.3 — Economic impact comparison panel (current vs simulated).
 */
import React from 'react';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase'
};

function money(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
}

function formatValue(m) {
  if (m.current == null && m.simulated == null) return { c: '—', s: '—', d: '—' };
  if (m.unit === '%') {
    const fmt = (v) => (v == null ? '—' : `${Number(v).toFixed(1)}%`);
    const d = m.delta == null ? '—' : `${m.delta >= 0 ? '+' : ''}${Number(m.delta).toFixed(1)} pp`;
    return { c: fmt(m.current), s: fmt(m.simulated), d };
  }
  return {
    c: money(m.current),
    s: money(m.simulated),
    d: m.delta == null ? '—' : `${m.delta >= 0 ? '+' : ''}${money(m.delta)}`
  };
}

export default function EconomicImpactComparisonPanel({ comparison = null }) {
  if (!comparison) {
    return (
      <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>
        Sem comparação — calcule o cenário para ver Δ económicos.
      </p>
    );
  }

  const exp = comparison.explainability || {};

  return (
    <div>
      <p style={{ ...mono, color: 'var(--cyan)', margin: '0 0 8px' }}>
        Impacto económico · actual vs simulado · {comparison.scenarioId}
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table className="data-table" style={{ width: '100%', fontSize: 12 }}>
          <thead>
            <tr>
              <th>Métrica</th>
              <th>Actual</th>
              <th>Simulado</th>
              <th>Δ</th>
            </tr>
          </thead>
          <tbody>
            {(comparison.metrics || []).map((m) => {
              const f = formatValue(m);
              const deltaColor =
                m.delta == null
                  ? 'var(--text-secondary)'
                  : m.delta > 0
                    ? 'var(--amber)'
                    : m.delta < 0
                      ? 'var(--green)'
                      : 'var(--text-secondary)';
              return (
                <tr key={m.id}>
                  <td>{m.label}</td>
                  <td style={{ fontFamily: 'var(--font-mono)' }}>{f.c}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--cyan)' }}>{f.s}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', color: deltaColor }}>{f.d}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        style={{
          marginTop: 12,
          padding: 10,
          border: '1px solid var(--border-subtle)',
          borderRadius: 4,
          background: 'var(--bg-tertiary)'
        }}
      >
        <p style={{ ...mono, color: 'var(--amber)', margin: '0 0 6px' }}>Explicabilidade</p>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px' }}>
          Hipóteses: {(exp.hypothesesApplied || []).map((h) => h.key).filter(Boolean).join(', ') || '—'}
        </p>
        <p style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', margin: '0 0 6px' }}>
          Contratos: {(exp.contractsUsed || []).join(' · ') || '—'}
        </p>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 11, color: 'var(--text-tertiary)' }}>
          {(exp.limitations || []).map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
