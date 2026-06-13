/**
 * AIOI-P8.2 — Executive Runtime Authorization Indicators (READ ONLY)
 */

import React from 'react';
import styles from './ExecutiveRuntimeAuthorization.module.css';

export function ExecutiveRuntimeAuthorizationIndicators({ metadata }) {
  return (
    <aside
      className={styles.indicatorsBar}
      data-testid="executive-runtime-authorization-indicators"
      aria-label="Executive Runtime Authorization Indicators"
    >
      <p className={styles.indicatorsEyebrow}>AIOI-P8.2 · RUNTIME AUTHORIZATION FOUNDATION</p>
      <div className={styles.metricsGrid} role="list" aria-label="Runtime Authorization Metrics">
        <div className={styles.metricItem} data-testid="executive-runtime-authorization-ready" role="listitem">
          <span className={styles.metricLabel}>Authorization Ready</span>
          <span className={styles.metricValue}>{metadata?.authorization_ready ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-authorized" role="listitem">
          <span className={styles.metricLabel}>Runtime Authorized</span>
          <span className={styles.metricValue}>{metadata?.runtime_authorized ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-authorization-enabled" role="listitem">
          <span className={styles.metricLabel}>Runtime Enabled</span>
          <span className={styles.metricValue}>{metadata?.runtime_enabled ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-authorization-active" role="listitem">
          <span className={styles.metricLabel}>Runtime Active</span>
          <span className={styles.metricValue}>{metadata?.runtime_active ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-authorization-mode" role="listitem">
          <span className={styles.metricLabel}>Authorization Mode</span>
          <span className={styles.metricValue}>{metadata?.authorization_mode || 'BLOCKED'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-authorization-status" role="listitem">
          <span className={styles.metricLabel}>Authorization Status</span>
          <span className={styles.metricValue}>{metadata?.authorization_status || 'FOUNDATION_ONLY'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-authorization-version" role="listitem">
          <span className={styles.metricLabel}>Authorization Version</span>
          <span className={styles.metricValue}>{metadata?.authorization_version || '1.0.0'}</span>
        </div>
      </div>
    </aside>
  );
}

export default ExecutiveRuntimeAuthorizationIndicators;
