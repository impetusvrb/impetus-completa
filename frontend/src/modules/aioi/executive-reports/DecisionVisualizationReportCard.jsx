/**
 * AIOI-P5.8 — Decision Visualization Report Card (READ ONLY · P5.3)
 */

import React from 'react';
import styles from './styles/ExecutiveReports.module.css';
import { ExecutiveReportsSection } from './ExecutiveReportsSection.jsx';

export function DecisionVisualizationReportCard({ viewModel }) {
  if (!viewModel) {
    return (
      <article className={styles.reportCard} data-testid="decision-visualization-report-card">
        <p className={styles.empty}>—</p>
      </article>
    );
  }

  const data = viewModel.contract?.data || {};

  return (
    <article
      className={styles.reportCard}
      data-testid="decision-visualization-report-card"
      aria-label={viewModel.title || 'Decision Visualization Report'}
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
          label="Decision Perspective"
          data={data.decision_perspective}
          testId="report-decision-perspective-section"
        />
        <ExecutiveReportsSection
          label="Decision Consistency"
          data={data.decision_consistency}
          testId="report-decision-consistency-section"
        />
        <ExecutiveReportsSection
          label="Decision Visualization Coverage"
          data={data.decision_visualization_coverage}
          testId="report-decision-coverage-section"
        />
        <ExecutiveReportsSection
          label="Enterprise Decision Visualization"
          data={data.enterprise_decision_visualization}
          testId="report-enterprise-decision-section"
        />
      </div>
    </article>
  );
}

export default DecisionVisualizationReportCard;
