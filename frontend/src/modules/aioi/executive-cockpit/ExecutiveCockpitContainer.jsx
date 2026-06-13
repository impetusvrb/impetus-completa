/**
 * AIOI-P5.4 — Executive Cockpit Container (READ ONLY · composição P5.3)
 */

import React from 'react';
import styles from './styles/ExecutiveCockpit.module.css';
import { useExecutiveCockpitViewModel } from './useExecutiveCockpitViewModel.js';
import ExecutiveSummaryCard from './ExecutiveSummaryCard.jsx';
import StrategicOverviewCard from './StrategicOverviewCard.jsx';
import DecisionVisualizationCard from './DecisionVisualizationCard.jsx';
import InterfaceIntelligenceCard from './InterfaceIntelligenceCard.jsx';

function CockpitStatePanel({ status, error, label }) {
  return (
    <div
      className={styles.statePanel}
      role="status"
      aria-live="polite"
      data-testid={`cockpit-state-${status}`}
    >
      {status === 'loading' && (
        <>
          <span className={styles.loadingDot} aria-hidden="true" />
          <p className={styles.stateLabel}>{label || 'Carregando'}</p>
          <p className={styles.stateMessage}>A carregar view models P5.3…</p>
        </>
      )}
      {status === 'empty' && (
        <>
          <p className={styles.stateLabel}>{label || 'Sem tenant'}</p>
          <p className={styles.stateMessage}>Selecione uma empresa para visualizar o cockpit.</p>
        </>
      )}
      {status === 'error' && (
        <>
          <p className={styles.stateLabel}>Erro</p>
          <p className={`${styles.stateMessage} ${styles.stateError}`}>{error}</p>
        </>
      )}
    </div>
  );
}

export function ExecutiveCockpitContainer({ companyId, fetcher }) {
  const { status, bundle, error, readOnly } = useExecutiveCockpitViewModel(companyId, {
    fetcher
  });

  if (status === 'loading' || status === 'idle') {
    return <CockpitStatePanel status="loading" />;
  }

  if (status === 'empty') {
    return <CockpitStatePanel status="empty" />;
  }

  if (status === 'error') {
    return <CockpitStatePanel status="error" error={error} />;
  }

  return (
    <>
      {readOnly && (
        <div className={styles.readOnlyBadge} data-testid="cockpit-read-only-badge">
          <span className={styles.readOnlyBadgeDot} aria-hidden="true" />
          Read Only
        </div>
      )}
      <section
        className={styles.grid}
        data-testid="executive-cockpit-grid"
        aria-label="Executive Cockpit"
      >
        <ExecutiveSummaryCard viewModel={bundle.executive_summary_view_model} />
        <StrategicOverviewCard viewModel={bundle.strategic_overview_view_model} />
        <DecisionVisualizationCard viewModel={bundle.decision_visualization_view_model} />
        <InterfaceIntelligenceCard viewModel={bundle.interface_intelligence_view_model} />
      </section>
    </>
  );
}

export default ExecutiveCockpitContainer;
