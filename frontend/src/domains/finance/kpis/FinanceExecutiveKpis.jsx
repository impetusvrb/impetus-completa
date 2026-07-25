/**
 * FIN-EVOLVE-002 — Strip de KPIs executivos (composição · IndustrialKpiPanel).
 */
import React from 'react';
import { IndustrialKpiPanel } from '../../../presentation/industrial-module';
import {
  trackFinanceKpiOpened
} from '../observability/financeObservability.js';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.08em',
  textTransform: 'uppercase'
};

export default function FinanceExecutiveKpis({ kpis = [], loading = false }) {
  if (loading) {
    return (
      <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>A carregar KPIs…</p>
    );
  }
  if (!kpis.length) {
    return (
      <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>
        Sem indicadores disponíveis nesta sessão.
      </p>
    );
  }
  return (
    <section
      aria-label="KPIs executivos Finance"
      onClick={() => trackFinanceKpiOpened('strip')}
    >
      <h3 style={{ ...mono, color: 'var(--cyan)', margin: '0 0 8px', fontSize: 11 }}>
        Indicadores executivos
      </h3>
      <IndustrialKpiPanel items={kpis} columns={4} />
    </section>
  );
}
