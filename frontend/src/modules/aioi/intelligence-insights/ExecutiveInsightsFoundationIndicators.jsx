/**
 * AIOI-P7.4 — Executive Insights Foundation Indicators (READ ONLY)
 */

import React from 'react';
import styles from './ExecutiveInsightsFoundation.module.css';

export function ExecutiveInsightsFoundationIndicators({ metadata }) {
  return (
    <aside
      className={styles.indicatorsBar}
      data-testid="executive-insights-foundation-indicators"
      aria-label="Executive Insights Foundation Indicators"
    >
      <p className={styles.indicatorsEyebrow}>AIOI-P7.4 · INSIGHTS FOUNDATION</p>
      <div className={styles.metricsGrid} role="list" aria-label="Insights Foundation Metrics">
        <div className={styles.metricItem} data-testid="executive-insights-foundation-ready" role="listitem">
          <span className={styles.metricLabel}>Insights Foundation Ready</span>
          <span className={styles.metricValue}>{metadata?.insights_foundation_ready ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-insights-contract-linked" role="listitem">
          <span className={styles.metricLabel}>Insights Contract Linked</span>
          <span className={styles.metricValue}>{metadata?.insights_contract_linked ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-insights-available" role="listitem">
          <span className={styles.metricLabel}>Insights Available</span>
          <span className={styles.metricValue}>{metadata?.insights_available ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-insights-runtime-active" role="listitem">
          <span className={styles.metricLabel}>Insights Runtime Active</span>
          <span className={styles.metricValue}>{metadata?.insights_runtime_active ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-insights-foundation-version" role="listitem">
          <span className={styles.metricLabel}>Insights Version</span>
          <span className={styles.metricValue}>{metadata?.insights_version || 'P7.4'}</span>
        </div>
      </div>
    </aside>
  );
}

export default ExecutiveInsightsFoundationIndicators;
