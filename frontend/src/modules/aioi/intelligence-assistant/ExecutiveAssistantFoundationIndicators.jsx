/**
 * AIOI-P7.6 — Executive Assistant Foundation Indicators (READ ONLY)
 */

import React from 'react';
import styles from './ExecutiveAssistantFoundation.module.css';

export function ExecutiveAssistantFoundationIndicators({ metadata }) {
  return (
    <aside
      className={styles.indicatorsBar}
      data-testid="executive-assistant-foundation-indicators"
      aria-label="Executive Assistant Foundation Indicators"
    >
      <p className={styles.indicatorsEyebrow}>AIOI-P7.6 · ASSISTANT FOUNDATION</p>
      <div className={styles.metricsGrid} role="list" aria-label="Assistant Foundation Metrics">
        <div className={styles.metricItem} data-testid="executive-assistant-foundation-ready" role="listitem">
          <span className={styles.metricLabel}>Assistant Foundation Ready</span>
          <span className={styles.metricValue}>{metadata?.assistant_foundation_ready ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-assistant-contract-linked" role="listitem">
          <span className={styles.metricLabel}>Assistant Contract Linked</span>
          <span className={styles.metricValue}>{metadata?.assistant_contract_linked ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-assistant-available" role="listitem">
          <span className={styles.metricLabel}>Assistant Available</span>
          <span className={styles.metricValue}>{metadata?.assistant_available ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-assistant-runtime-active" role="listitem">
          <span className={styles.metricLabel}>Assistant Runtime Active</span>
          <span className={styles.metricValue}>{metadata?.assistant_runtime_active ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-assistant-foundation-version" role="listitem">
          <span className={styles.metricLabel}>Assistant Version</span>
          <span className={styles.metricValue}>{metadata?.assistant_version || 'P7.6'}</span>
        </div>
      </div>
    </aside>
  );
}

export default ExecutiveAssistantFoundationIndicators;
