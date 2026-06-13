/**
 * AIOI-P5.8 — Executive Reports Container (READ ONLY · composição P5.3 bundle)
 */

import React from 'react';
import styles from './styles/ExecutiveReports.module.css';
import { useExecutiveReportsViewModel } from './useExecutiveReportsViewModel.js';
import ExecutiveSummaryReportCard from './ExecutiveSummaryReportCard.jsx';
import StrategicOverviewReportCard from './StrategicOverviewReportCard.jsx';
import DecisionVisualizationReportCard from './DecisionVisualizationReportCard.jsx';
import InterfaceIntelligenceReportCard from './InterfaceIntelligenceReportCard.jsx';

function ReportsStatePanel({ status, error }) {
  return (
    <div
      className={styles.statePanel}
      role="status"
      aria-live="polite"
      data-testid={`executive-reports-state-${status}`}
    >
      {status === 'loading' && (
        <>
          <span className={styles.loadingDot} aria-hidden="true" />
          <p className={styles.stateLabel}>Carregando</p>
          <p className={styles.stateMessage}>A carregar relatórios executivos P5.3…</p>
        </>
      )}
      {status === 'empty' && (
        <>
          <p className={styles.stateLabel}>Sem tenant</p>
          <p className={styles.stateMessage}>Selecione uma empresa para visualizar relatórios.</p>
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

export function ExecutiveReportsContainer({ companyId, fetcher }) {
  const { status, bundle, error, readOnly } = useExecutiveReportsViewModel(companyId, {
    fetcher
  });

  if (status === 'loading' || status === 'idle') {
    return <ReportsStatePanel status="loading" />;
  }

  if (status === 'empty') {
    return <ReportsStatePanel status="empty" />;
  }

  if (status === 'error') {
    return <ReportsStatePanel status="error" error={error} />;
  }

  return (
    <>
      {readOnly && (
        <div className={styles.readOnlyBadge} data-testid="executive-reports-read-only-badge">
          <span className={styles.readOnlyBadgeDot} aria-hidden="true" />
          Read Only
        </div>
      )}
      <section
        className={styles.grid}
        data-testid="executive-reports-grid"
        aria-label="Executive Reports"
      >
        <ExecutiveSummaryReportCard viewModel={bundle.executive_summary_view_model} />
        <StrategicOverviewReportCard viewModel={bundle.strategic_overview_view_model} />
        <DecisionVisualizationReportCard viewModel={bundle.decision_visualization_view_model} />
        <InterfaceIntelligenceReportCard viewModel={bundle.interface_intelligence_view_model} />
      </section>
    </>
  );
}

export default ExecutiveReportsContainer;
