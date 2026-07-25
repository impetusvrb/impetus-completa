/**
 * FIN-EVOLVE-2.3 — Hub card: What-if Analysis entry.
 */
import React from 'react';
import { Link } from 'react-router-dom';
import { trackWhatIfStarted } from '../../observability/financeObservability.js';
import { FIN_EVOLVE_23_PHASE } from '../scenario-engine/whatIfConstants.js';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
};

export default function FinanceWhatIfHubCard() {
  return (
    <section
      className="impetus-card"
      aria-label="What-if Analysis"
      style={{
        padding: '1rem',
        borderRadius: 4,
        border: '1px solid var(--border-subtle)',
        borderBottom: '2px solid transparent',
        borderImage: 'linear-gradient(90deg, var(--amber), transparent) 1'
      }}
    >
      <p style={{ ...mono, color: 'var(--amber)', margin: '0 0 6px' }}>
        {FIN_EVOLVE_23_PHASE} · SIMULATE WITHOUT MUTATING
      </p>
      <h3 style={{ margin: '0 0 8px', fontSize: 15, letterSpacing: '0.03em' }}>
        What-if Analysis
      </h3>
      <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 10px' }}>
        Cenários hipotéticos sobre o Twin Financeiro e o Economic Intelligence Engine — composição
        temporária, sem alterar dados operacionais.
      </p>
      <Link
        to="/app/finance/whatif"
        className="btn btn-ghost"
        style={{ borderRadius: 4, fontSize: 12, textDecoration: 'none', display: 'inline-block' }}
        onClick={() => trackWhatIfStarted({ source: 'hub_card' })}
      >
        Abrir What-if Analysis
      </Link>
    </section>
  );
}
