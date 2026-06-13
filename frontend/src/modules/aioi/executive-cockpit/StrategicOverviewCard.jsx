/**
 * AIOI-P5.4 — Strategic Overview Card (READ ONLY · P5.3 view model)
 */

import React from 'react';
import styles from './styles/ExecutiveCockpit.module.css';
import { ExecutiveDataSection } from './ExecutiveDataSection.jsx';

export function StrategicOverviewCard({ viewModel }) {
  if (!viewModel) {
    return (
      <article
        className={styles.card}
        data-testid="strategic-overview-card"
        aria-label="Strategic Overview"
      >
        <p className={styles.empty}>—</p>
      </article>
    );
  }

  const data = viewModel.contract?.data || {};

  return (
    <article
      className={styles.card}
      data-testid="strategic-overview-card"
      aria-label={viewModel.title || 'Strategic Overview'}
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
          label="Strategic Overview"
          data={data.strategic_overview}
          testId="strategic-overview-section"
        />
        <ExecutiveDataSection
          label="Visualization Readiness"
          data={data.visualization_readiness}
          testId="visualization-readiness-section"
        />
      </div>
    </article>
  );
}

export default StrategicOverviewCard;
