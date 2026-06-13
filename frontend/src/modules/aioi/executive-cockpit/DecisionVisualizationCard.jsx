/**
 * AIOI-P5.4 — Decision Visualization Card (READ ONLY · P5.3 view model)
 */

import React from 'react';
import styles from './styles/ExecutiveCockpit.module.css';
import { ExecutiveDataSection } from './ExecutiveDataSection.jsx';

export function DecisionVisualizationCard({ viewModel }) {
  if (!viewModel) {
    return (
      <article
        className={styles.card}
        data-testid="decision-visualization-card"
        aria-label="Decision Visualization"
      >
        <p className={styles.empty}>—</p>
      </article>
    );
  }

  const data = viewModel.contract?.data || {};

  return (
    <article
      className={styles.card}
      data-testid="decision-visualization-card"
      aria-label={viewModel.title || 'Decision Visualization'}
    >
      <header className={styles.cardHeader}>
        <p className={styles.cardView}>{viewModel.view}</p>
        <h2 className={styles.cardTitle}>{viewModel.title}</h2>
        {viewModel.generated_at && (
          <p className={styles.cardTimestamp}>{viewModel.generated_at}</p>
        )}
      </header>
      <div className={styles.cardBody}>
        <ExecutiveDataSection
          label="Decision Perspective"
          data={data.decision_perspective}
          testId="decision-perspective-section"
        />
        <ExecutiveDataSection
          label="Decision Consistency"
          data={data.decision_consistency}
          testId="decision-consistency-section"
        />
        <ExecutiveDataSection
          label="Decision Visualization Coverage"
          data={data.decision_visualization_coverage}
          testId="decision-visualization-coverage-section"
        />
        <ExecutiveDataSection
          label="Enterprise Decision Visualization"
          data={data.enterprise_decision_visualization}
          testId="enterprise-decision-visualization-section"
        />
      </div>
    </article>
  );
}

export default DecisionVisualizationCard;
