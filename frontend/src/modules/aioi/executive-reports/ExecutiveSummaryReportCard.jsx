/**
 * AIOI-P5.8 — Executive Summary Report Card (READ ONLY · P5.3)
 */

import React from 'react';
import styles from './styles/ExecutiveReports.module.css';
import { ExecutiveReportsSection } from './ExecutiveReportsSection.jsx';

export function ExecutiveSummaryReportCard({ viewModel }) {
  if (!viewModel) {
    return (
      <article className={styles.reportCard} data-testid="executive-summary-report-card">
        <p className={styles.empty}>—</p>
      </article>
    );
  }

  const data = viewModel.contract?.data || {};

  return (
    <article
      className={styles.reportCard}
      data-testid="executive-summary-report-card"
      aria-label={viewModel.title || 'Executive Summary Report'}
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
          label="Executive Summary"
          data={data.executive_summary}
          testId="report-executive-summary-section"
        />
        <ExecutiveReportsSection
          label="Cockpit Readiness"
          data={data.cockpit_readiness}
          testId="report-cockpit-readiness-section"
        />
      </div>
    </article>
  );
}

export default ExecutiveSummaryReportCard;
