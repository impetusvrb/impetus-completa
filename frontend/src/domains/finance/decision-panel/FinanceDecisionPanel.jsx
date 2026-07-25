/**
 * FIN-EVOLVE-002 — Painel de decisões sugeridas (compose de sinais existentes).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { getFinanceOfficialRoute } from '../metadata/financeNavigationMetadata.js';
import { trackFinanceDecisionExecuted } from '../observability/financeObservability.js';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase'
};

function priorityColor(p) {
  if (p === 'alta') return 'var(--red)';
  if (p === 'média' || p === 'media') return 'var(--amber)';
  return 'var(--cyan)';
}

export default function FinanceDecisionPanel({ decisions = [], loading = false }) {
  return (
    <section
      className="impetus-card"
      style={{ padding: '1rem', borderRadius: 4, border: '1px solid var(--border-subtle)' }}
    >
      <h3 style={{ ...mono, color: 'var(--green)', margin: '0 0 8px', fontSize: 11 }}>
        Principais decisões sugeridas hoje
      </h3>
      {loading && (
        <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>A carregar…</p>
      )}
      {!loading && decisions.length === 0 && (
        <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>
          Sem decisões compostas — sinais de custo/leakage indisponíveis.
        </p>
      )}
      <ol style={{ margin: 0, paddingLeft: 18 }}>
        {decisions.map((d) => {
          const to = getFinanceOfficialRoute(d.pathKey) || '/app/finance';
          return (
            <li key={d.id} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 13, color: 'var(--text-primary)' }}>{d.title}</div>
              <div style={{ ...mono, fontSize: 9, marginTop: 4, color: 'var(--text-tertiary)' }}>
                origem: {d.origin} · impacto: {d.impact} ·{' '}
                <span style={{ color: priorityColor(d.priority) }}>prioridade {d.priority}</span>
              </div>
              {d.evidence && (
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  evidência: {d.evidence}
                </div>
              )}
              <Link
                to={to}
                onClick={() => trackFinanceDecisionExecuted(d.id)}
                style={{ ...mono, color: 'var(--cyan)', fontSize: 10, textDecoration: 'none' }}
              >
                Executar →
              </Link>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
