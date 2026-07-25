/**
 * FIN-EVOLVE-002 — Insights executivos (compose costs / leakage / billing).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { getFinanceOfficialRoute } from '../metadata/financeNavigationMetadata.js';
import { trackFinanceInsightClicked } from '../observability/financeObservability.js';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase'
};

export default function FinanceInsightsPanel({ insights = [], loading = false }) {
  return (
    <section
      className="impetus-card"
      style={{ padding: '1rem', borderRadius: 4, border: '1px solid var(--border-subtle)' }}
    >
      <h3 style={{ ...mono, color: 'var(--cyan)', margin: '0 0 8px', fontSize: 11 }}>
        Insights financeiros
      </h3>
      {loading && (
        <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>A carregar…</p>
      )}
      {!loading && insights.length === 0 && (
        <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>
          Sem insights compostos nesta sessão.
        </p>
      )}
      <div style={{ display: 'grid', gap: 8 }}>
        {insights.map((ins) => {
          const to = getFinanceOfficialRoute(ins.pathKey) || '/app/finance';
          return (
            <Link
              key={ins.id}
              to={to}
              onClick={() => trackFinanceInsightClicked(ins.id)}
              style={{
                textDecoration: 'none',
                color: 'inherit',
                padding: '8px 10px',
                borderRadius: 4,
                border: '1px solid var(--border-subtle)',
                background: 'var(--bg-tertiary)'
              }}
            >
              <div style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 9 }}>{ins.source}</div>
              <div style={{ fontSize: 13, marginTop: 2 }}>{ins.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{ins.summary}</div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
