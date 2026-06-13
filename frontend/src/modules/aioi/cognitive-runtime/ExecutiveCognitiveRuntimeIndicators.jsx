/**
 * AIOI-P8.0 — Executive Cognitive Runtime Indicators (READ ONLY)
 */

import React from 'react';
import styles from './ExecutiveCognitiveRuntime.module.css';

export function ExecutiveCognitiveRuntimeIndicators({ metadata, supported }) {
  return (
    <aside
      className={styles.indicatorsBar}
      data-testid="executive-cognitive-runtime-indicators"
      aria-label="Executive Cognitive Runtime Indicators"
    >
      <p className={styles.indicatorsEyebrow}>AIOI-P8.0 · COGNITIVE RUNTIME FOUNDATION</p>
      <div className={styles.metricsGrid} role="list" aria-label="Cognitive Runtime Metrics">
        <div className={styles.metricItem} data-testid="executive-cognitive-runtime-ready" role="listitem">
          <span className={styles.metricLabel}>Runtime Ready</span>
          <span className={styles.metricValue}>{metadata?.runtime_ready ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-cognitive-runtime-supported" role="listitem">
          <span className={styles.metricLabel}>Runtime Supported</span>
          <span className={styles.metricValue}>{supported ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-cognitive-runtime-active" role="listitem">
          <span className={styles.metricLabel}>Runtime Active</span>
          <span className={styles.metricValue}>{metadata?.runtime_active ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-cognitive-runtime-enabled" role="listitem">
          <span className={styles.metricLabel}>Runtime Enabled</span>
          <span className={styles.metricValue}>{metadata?.runtime_enabled ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-cognitive-runtime-version" role="listitem">
          <span className={styles.metricLabel}>Runtime Version</span>
          <span className={styles.metricValue}>{metadata?.runtime_version || 'P8.0'}</span>
        </div>
      </div>
    </aside>
  );
}

export default ExecutiveCognitiveRuntimeIndicators;
