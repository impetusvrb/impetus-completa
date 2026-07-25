/**
 * FIN-EVOLVE-2.2 — Hub card: Digital Twin Financeiro (composition entry).
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { trackTwinOpened } from '../../observability/financeObservability.js';
import { FIN_EVOLVE_22_PHASE } from '../overlay/financialTwinOverlay.js';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
};

function money(v) {
  if (v == null || Number.isNaN(Number(v))) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v));
}

export default function FinanceTwinHubCard({ summary = null, loading = false }) {
  return (
    <section
      className="impetus-card"
      aria-label="Digital Twin Financeiro"
      style={{
        padding: '1rem',
        borderRadius: 4,
        border: '1px solid var(--border-subtle)',
        borderBottom: '2px solid transparent',
        borderImage: 'linear-gradient(90deg, var(--cyan), transparent) 1'
      }}
    >
      <p style={{ ...mono, color: 'var(--cyan)', margin: '0 0 6px' }}>
        {FIN_EVOLVE_22_PHASE} · ONE TWIN · perspectiva financeira
      </p>
      <h3 style={{ margin: '0 0 8px', fontSize: 15, letterSpacing: '0.03em' }}>
        Digital Twin Financeiro
      </h3>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px' }}>
        Overlay económico sobre o Twin industrial existente — composição, sem Twin paralelo.
      </p>
      {loading && (
        <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>A compor estado…</p>
      )}
      {!loading && summary && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 8,
            marginBottom: 10,
            fontFamily: 'var(--font-mono)',
            fontSize: 11
          }}
        >
          <div>
            <div style={{ color: 'var(--text-tertiary)' }}>NÓS</div>
            <div style={{ color: 'var(--text-primary)' }}>{summary.nodeCount ?? 0}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-tertiary)' }}>CUSTO UNIT.</div>
            <div style={{ color: 'var(--cyan)' }}>{money(summary.unitCost)}</div>
          </div>
          <div>
            <div style={{ color: 'var(--text-tertiary)' }}>EFICIÊNCIA</div>
            <div style={{ color: 'var(--green)' }}>
              {summary.efficiency != null ? `${Number(summary.efficiency).toFixed(1)}%` : '—'}
            </div>
          </div>
          <div>
            <div style={{ color: 'var(--text-tertiary)' }}>PERDAS</div>
            <div style={{ color: 'var(--red)' }}>{money(summary.losses)}</div>
          </div>
        </div>
      )}
      <Link
        to="/app/finance/twin"
        className="btn btn-ghost"
        style={{ borderRadius: 4, fontSize: 12, textDecoration: 'none', display: 'inline-block' }}
        onClick={() => trackTwinOpened({ source: 'hub_card' })}
      >
        Abrir visão financeira do Twin
      </Link>
    </section>
  );
}
