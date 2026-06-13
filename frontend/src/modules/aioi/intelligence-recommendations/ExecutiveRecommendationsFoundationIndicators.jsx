/**
 * AIOI-P7.5 — Executive Recommendations Foundation Indicators (READ ONLY)
 */

import React from 'react';
import styles from './ExecutiveRecommendationsFoundation.module.css';

export function ExecutiveRecommendationsFoundationIndicators({ metadata }) {
  return (
    <aside
      className={styles.indicatorsBar}
      data-testid="executive-recommendations-foundation-indicators"
      aria-label="Executive Recommendations Foundation Indicators"
    >
      <p className={styles.indicatorsEyebrow}>AIOI-P7.5 · RECOMMENDATIONS FOUNDATION</p>
      <div className={styles.metricsGrid} role="list" aria-label="Recommendations Foundation Metrics">
        <div className={styles.metricItem} data-testid="executive-recommendations-foundation-ready" role="listitem">
          <span className={styles.metricLabel}>Recommendations Foundation Ready</span>
          <span className={styles.metricValue}>{metadata?.recommendations_foundation_ready ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-recommendations-contract-linked" role="listitem">
          <span className={styles.metricLabel}>Recommendations Contract Linked</span>
          <span className={styles.metricValue}>{metadata?.recommendations_contract_linked ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-recommendations-available" role="listitem">
          <span className={styles.metricLabel}>Recommendations Available</span>
          <span className={styles.metricValue}>{metadata?.recommendations_available ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-recommendations-runtime-active" role="listitem">
          <span className={styles.metricLabel}>Recommendations Runtime Active</span>
          <span className={styles.metricValue}>{metadata?.recommendations_runtime_active ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-recommendations-foundation-version" role="listitem">
          <span className={styles.metricLabel}>Recommendations Version</span>
          <span className={styles.metricValue}>{metadata?.recommendations_version || 'P7.5'}</span>
        </div>
      </div>
    </aside>
  );
}

export default ExecutiveRecommendationsFoundationIndicators;
