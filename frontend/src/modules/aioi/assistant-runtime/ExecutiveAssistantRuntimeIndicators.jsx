/**
 * AIOI-P8.6 — Executive Assistant Runtime Indicators (READ ONLY)
 */

import React from 'react';
import styles from './ExecutiveAssistantRuntime.module.css';

export function ExecutiveAssistantRuntimeIndicators({ metadata }) {
  return (
    <aside
      className={styles.indicatorsBar}
      data-testid="executive-assistant-runtime-indicators"
      aria-label="Executive Assistant Runtime Indicators"
    >
      <p className={styles.indicatorsEyebrow}>AIOI-P8.6 · ASSISTANT RUNTIME FOUNDATION</p>
      <div className={styles.metricsGrid} role="list" aria-label="Assistant Runtime Metrics">
        <div className={styles.metricItem} data-testid="executive-assistant-runtime-ready" role="listitem">
          <span className={styles.metricLabel}>Assistant Ready</span>
          <span className={styles.metricValue}>{metadata?.assistant_ready ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-assistant-runtime-available" role="listitem">
          <span className={styles.metricLabel}>Assistant Runtime Available</span>
          <span className={styles.metricValue}>{metadata?.assistant_runtime_available ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-assistant-runtime-authorized" role="listitem">
          <span className={styles.metricLabel}>Runtime Authorized</span>
          <span className={styles.metricValue}>{metadata?.runtime_authorized ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-assistant-runtime-enabled" role="listitem">
          <span className={styles.metricLabel}>Runtime Enabled</span>
          <span className={styles.metricValue}>{metadata?.runtime_enabled ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-assistant-runtime-active" role="listitem">
          <span className={styles.metricLabel}>Runtime Active</span>
          <span className={styles.metricValue}>{metadata?.runtime_active ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-assistant-runtime-cognitive" role="listitem">
          <span className={styles.metricLabel}>Cognitive Execution Allowed</span>
          <span className={styles.metricValue}>{metadata?.cognitive_execution_allowed ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-assistant-runtime-mode" role="listitem">
          <span className={styles.metricLabel}>Assistant Mode</span>
          <span className={styles.metricValue}>{metadata?.assistant_mode || 'FOUNDATION_ONLY'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-assistant-runtime-status" role="listitem">
          <span className={styles.metricLabel}>Assistant Status</span>
          <span className={styles.metricValue}>{metadata?.assistant_status || 'READY'}</span>
        </div>
      </div>
    </aside>
  );
}

export default ExecutiveAssistantRuntimeIndicators;
