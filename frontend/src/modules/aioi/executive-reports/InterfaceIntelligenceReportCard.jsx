/**
 * AIOI-P5.8 — Interface Intelligence Report Card (READ ONLY · P5.3)
 */

import React from 'react';
import styles from './styles/ExecutiveReports.module.css';
import { ExecutiveReportsSection } from './ExecutiveReportsSection.jsx';

export function InterfaceIntelligenceReportCard({ viewModel }) {
  if (!viewModel) {
    return (
      <article className={styles.reportCard} data-testid="interface-intelligence-report-card">
        <p className={styles.empty}>—</p>
      </article>
    );
  }

  const data = viewModel.contract?.data || {};

  return (
    <article
      className={styles.reportCard}
      data-testid="interface-intelligence-report-card"
      aria-label={viewModel.title || 'Interface Intelligence Report'}
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
          label="Interface Perspective"
          data={data.interface_perspective}
          testId="report-interface-perspective-section"
        />
        <ExecutiveReportsSection
          label="Interface Consistency"
          data={data.interface_consistency}
          testId="report-interface-consistency-section"
        />
        <ExecutiveReportsSection
          label="Interface Coverage"
          data={data.interface_coverage}
          testId="report-interface-coverage-section"
        />
        <ExecutiveReportsSection
          label="Enterprise Interface Intelligence"
          data={data.enterprise_interface_intelligence}
          testId="report-enterprise-interface-section"
        />
      </div>
    </article>
  );
}

export default InterfaceIntelligenceReportCard;
