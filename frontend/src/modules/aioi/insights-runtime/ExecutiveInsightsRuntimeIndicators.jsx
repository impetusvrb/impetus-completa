/**
 * AIOI-P8.4 — Executive Insights Runtime Indicators (READ ONLY)
 */

import React from 'react';
import styles from './ExecutiveInsightsRuntime.module.css';

export function ExecutiveInsightsRuntimeIndicators({ metadata, authorizationStatus, auditStatus }) {
  return (
    <aside
      className={styles.indicatorsBar}
      data-testid="executive-insights-runtime-indicators"
      aria-label="Executive Insights Runtime Indicators"
    >
      <p className={styles.indicatorsEyebrow}>AIOI-P8.4 · INSIGHTS RUNTIME FOUNDATION</p>
      <div className={styles.metricsGrid} role="list" aria-label="Insights Runtime Metrics">
        <div className={styles.metricItem} data-testid="executive-insights-runtime-ready" role="listitem">
          <span className={styles.metricLabel}>Insights Ready</span>
          <span className={styles.metricValue}>{metadata?.insights_ready ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-insights-runtime-available" role="listitem">
          <span className={styles.metricLabel}>Insights Runtime Available</span>
          <span className={styles.metricValue}>{metadata?.insights_runtime_available ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-insights-runtime-enabled" role="listitem">
          <span className={styles.metricLabel}>Runtime Enabled</span>
          <span className={styles.metricValue}>{metadata?.runtime_enabled ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-insights-runtime-active" role="listitem">
          <span className={styles.metricLabel}>Runtime Active</span>
          <span className={styles.metricValue}>{metadata?.runtime_active ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-insights-runtime-authorization-status" role="listitem">
          <span className={styles.metricLabel}>Authorization Status</span>
          <span className={styles.metricValue}>{authorizationStatus || 'FOUNDATION_ONLY'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-insights-runtime-audit-status" role="listitem">
          <span className={styles.metricLabel}>Audit Status</span>
          <span className={styles.metricValue}>{auditStatus || 'READY'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-insights-runtime-mode" role="listitem">
          <span className={styles.metricLabel}>Insights Mode</span>
          <span className={styles.metricValue}>{metadata?.insights_mode || 'FOUNDATION_ONLY'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-insights-runtime-status" role="listitem">
          <span className={styles.metricLabel}>Insights Status</span>
          <span className={styles.metricValue}>{metadata?.insights_status || 'READY'}</span>
        </div>
      </div>
    </aside>
  );
}

export default ExecutiveInsightsRuntimeIndicators;
