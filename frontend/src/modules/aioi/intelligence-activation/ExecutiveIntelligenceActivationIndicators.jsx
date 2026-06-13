/**
 * AIOI-P7.2 — Executive Intelligence Activation Indicators (READ ONLY)
 */

import React from 'react';
import styles from './ExecutiveIntelligenceActivation.module.css';

export function ExecutiveIntelligenceActivationIndicators({ metadata }) {
  return (
    <aside
      className={styles.indicatorsBar}
      data-testid="executive-intelligence-activation-indicators"
      aria-label="Executive Intelligence Activation Indicators"
    >
      <p className={styles.indicatorsEyebrow}>AIOI-P7.2 · ACTIVATION FRAMEWORK</p>
      <div className={styles.metricsGrid} role="list" aria-label="Intelligence Activation Metrics">
        <div className={styles.metricItem} data-testid="executive-intelligence-activation-framework-ready" role="listitem">
          <span className={styles.metricLabel}>Activation Framework Ready</span>
          <span className={styles.metricValue}>{metadata?.activation_framework_ready ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-intelligence-activation-supported" role="listitem">
          <span className={styles.metricLabel}>Activation Supported</span>
          <span className={styles.metricValue}>{metadata?.activation_supported ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-intelligence-activation-enabled" role="listitem">
          <span className={styles.metricLabel}>Activation Enabled</span>
          <span className={styles.metricValue}>{metadata?.activation_enabled ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-intelligence-activation-version" role="listitem">
          <span className={styles.metricLabel}>Activation Version</span>
          <span className={styles.metricValue}>{metadata?.activation_version || 'P7.2'}</span>
        </div>
      </div>
    </aside>
  );
}

export default ExecutiveIntelligenceActivationIndicators;
