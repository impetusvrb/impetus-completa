/**
 * AIOI-P5.6 — Decision Visualization Container (READ ONLY · composição P5.3)
 */

import React from 'react';
import styles from './styles/DecisionVisualization.module.css';
import { useDecisionVisualizationViewModel } from './useDecisionVisualizationViewModel.js';
import DecisionPerspectiveCard from './DecisionPerspectiveCard.jsx';
import DecisionConsistencyCard from './DecisionConsistencyCard.jsx';
import DecisionCoverageCard from './DecisionCoverageCard.jsx';
import EnterpriseDecisionVisualizationCard from './EnterpriseDecisionVisualizationCard.jsx';

function DecisionStatePanel({ status, error }) {
  return (
    <div
      className={styles.statePanel}
      role="status"
      aria-live="polite"
      data-testid={`decision-viz-state-${status}`}
    >
      {status === 'loading' && (
        <>
          <span className={styles.loadingDot} aria-hidden="true" />
          <p className={styles.stateLabel}>Carregando</p>
          <p className={styles.stateMessage}>A carregar view model P5.3…</p>
        </>
      )}
      {status === 'empty' && (
        <>
          <p className={styles.stateLabel}>Sem tenant</p>
          <p className={styles.stateMessage}>Selecione uma empresa para visualizar decisões.</p>
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

export function DecisionVisualizationContainer({ companyId, fetcher }) {
  const { status, viewModel, error, readOnly } = useDecisionVisualizationViewModel(companyId, {
    fetcher
  });

  if (status === 'loading' || status === 'idle') {
    return <DecisionStatePanel status="loading" />;
  }

  if (status === 'empty') {
    return <DecisionStatePanel status="empty" />;
  }

  if (status === 'error') {
    return <DecisionStatePanel status="error" error={error} />;
  }

  const data = viewModel?.contract?.data || {};

  return (
    <>
      {readOnly && (
        <div className={styles.readOnlyBadge} data-testid="decision-viz-read-only-badge">
          <span className={styles.readOnlyBadgeDot} aria-hidden="true" />
          Read Only
        </div>
      )}
      <section
        className={styles.grid}
        data-testid="decision-visualization-grid"
        aria-label="Decision Visualization"
      >
        <DecisionPerspectiveCard data={data.decision_perspective} />
        <DecisionConsistencyCard data={data.decision_consistency} />
        <DecisionCoverageCard data={data.decision_visualization_coverage} />
        <EnterpriseDecisionVisualizationCard data={data.enterprise_decision_visualization} />
      </section>
    </>
  );
}

export default DecisionVisualizationContainer;
