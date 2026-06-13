/**
 * AIOI-P5.4 — Executive Summary Card (READ ONLY · P5.3 view model)
 */

import React from 'react';
import styles from './styles/ExecutiveCockpit.module.css';
import { ExecutiveDataSection } from './ExecutiveDataSection.jsx';

export function ExecutiveSummaryCard({ viewModel }) {
  if (!viewModel) {
    return (
      <article
        className={styles.card}
        data-testid="executive-summary-card"
        aria-label="Executive Summary"
      >
        <p className={styles.empty}>—</p>
      </article>
    );
  }

  const data = viewModel.contract?.data || {};

  return (
    <article
      className={styles.card}
      data-testid="executive-summary-card"
      aria-label={viewModel.title || 'Executive Summary'}
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
          label="Executive Summary"
          data={data.executive_summary}
          testId="executive-summary-section"
        />
        <ExecutiveDataSection
          label="Cockpit Readiness"
          data={data.cockpit_readiness}
          testId="cockpit-readiness-section"
        />
      </div>
    </article>
  );
}

export default ExecutiveSummaryCard;
