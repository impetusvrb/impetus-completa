/**
 * AIOI-P5.4 — Interface Intelligence Card (READ ONLY · P5.3 view model)
 */

import React from 'react';
import styles from './styles/ExecutiveCockpit.module.css';
import { ExecutiveDataSection } from './ExecutiveDataSection.jsx';

export function InterfaceIntelligenceCard({ viewModel }) {
  if (!viewModel) {
    return (
      <article
        className={styles.card}
        data-testid="interface-intelligence-card"
        aria-label="Interface Intelligence"
      >
        <p className={styles.empty}>—</p>
      </article>
    );
  }

  const data = viewModel.contract?.data || {};

  return (
    <article
      className={styles.card}
      data-testid="interface-intelligence-card"
      aria-label={viewModel.title || 'Interface Intelligence'}
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
          label="Interface Perspective"
          data={data.interface_perspective}
          testId="interface-perspective-section"
        />
        <ExecutiveDataSection
          label="Interface Consistency"
          data={data.interface_consistency}
          testId="interface-consistency-section"
        />
        <ExecutiveDataSection
          label="Interface Coverage"
          data={data.interface_coverage}
          testId="interface-coverage-section"
        />
        <ExecutiveDataSection
          label="Enterprise Interface Intelligence"
          data={data.enterprise_interface_intelligence}
          testId="enterprise-interface-intelligence-section"
        />
      </div>
    </article>
  );
}

export default InterfaceIntelligenceCard;
