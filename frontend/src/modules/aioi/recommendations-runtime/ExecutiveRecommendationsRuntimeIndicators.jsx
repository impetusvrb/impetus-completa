/**
 * AIOI-P8.5 — Executive Recommendations Runtime Indicators (READ ONLY)
 */

import React from 'react';
import styles from './ExecutiveRecommendationsRuntime.module.css';

export function ExecutiveRecommendationsRuntimeIndicators({ metadata }) {
  return (
    <aside
      className={styles.indicatorsBar}
      data-testid="executive-recommendations-runtime-indicators"
      aria-label="Executive Recommendations Runtime Indicators"
    >
      <p className={styles.indicatorsEyebrow}>AIOI-P8.5 · RECOMMENDATIONS RUNTIME FOUNDATION</p>
      <div className={styles.metricsGrid} role="list" aria-label="Recommendations Runtime Metrics">
        <div className={styles.metricItem} data-testid="executive-recommendations-runtime-ready" role="listitem">
          <span className={styles.metricLabel}>Recommendations Ready</span>
          <span className={styles.metricValue}>{metadata?.recommendations_ready ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-recommendations-runtime-available" role="listitem">
          <span className={styles.metricLabel}>Recommendations Runtime Available</span>
          <span className={styles.metricValue}>{metadata?.recommendations_runtime_available ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-recommendations-runtime-authorized" role="listitem">
          <span className={styles.metricLabel}>Runtime Authorized</span>
          <span className={styles.metricValue}>{metadata?.runtime_authorized ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-recommendations-runtime-enabled" role="listitem">
          <span className={styles.metricLabel}>Runtime Enabled</span>
          <span className={styles.metricValue}>{metadata?.runtime_enabled ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-recommendations-runtime-active" role="listitem">
          <span className={styles.metricLabel}>Runtime Active</span>
          <span className={styles.metricValue}>{metadata?.runtime_active ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-recommendations-runtime-cognitive" role="listitem">
          <span className={styles.metricLabel}>Cognitive Execution Allowed</span>
          <span className={styles.metricValue}>{metadata?.cognitive_execution_allowed ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-recommendations-runtime-mode" role="listitem">
          <span className={styles.metricLabel}>Recommendations Mode</span>
          <span className={styles.metricValue}>{metadata?.recommendations_mode || 'FOUNDATION_ONLY'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-recommendations-runtime-status" role="listitem">
          <span className={styles.metricLabel}>Recommendations Status</span>
          <span className={styles.metricValue}>{metadata?.recommendations_status || 'READY'}</span>
        </div>
      </div>
    </aside>
  );
}

export default ExecutiveRecommendationsRuntimeIndicators;
