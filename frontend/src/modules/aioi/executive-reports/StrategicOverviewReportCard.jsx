/**
 * AIOI-P5.8 — Strategic Overview Report Card (READ ONLY · P5.3)
 */

import React from 'react';
import styles from './styles/ExecutiveReports.module.css';
import { ExecutiveReportsSection } from './ExecutiveReportsSection.jsx';

export function StrategicOverviewReportCard({ viewModel }) {
  if (!viewModel) {
    return (
      <article className={styles.reportCard} data-testid="strategic-overview-report-card">
        <p className={styles.empty}>—</p>
      </article>
    );
  }

  const data = viewModel.contract?.data || {};

  return (
    <article
      className={styles.reportCard}
      data-testid="strategic-overview-report-card"
      aria-label={viewModel.title || 'Strategic Overview Report'}
    >
      <header className={styles.reportHeader}>
        <p className={styles.reportView}>{viewModel.view}</p>
        <h2 className={styles.reportTitle}>{viewModel.title}</h2>
        {viewModel.generated_at && (
          <p className={styles.reportTimestamp}>{viewModel.generated_at}</p>
        )}
      </header>
      <div className={styles.reportBody}>
        <ExecutiveReportsSection
          label="Strategic Overview"
          data={data.strategic_overview}
          testId="report-strategic-overview-section"
        />
        <ExecutiveReportsSection
          label="Visualization Readiness"
          data={data.visualization_readiness}
          testId="report-visualization-readiness-section"
        />
      </div>
    </article>
  );
}

export default StrategicOverviewReportCard;
