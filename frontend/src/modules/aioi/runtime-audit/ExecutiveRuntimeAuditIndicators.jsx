/**
 * AIOI-P8.3 — Executive Runtime Audit Indicators (READ ONLY)
 */

import React from 'react';
import styles from './ExecutiveRuntimeAudit.module.css';

export function ExecutiveRuntimeAuditIndicators({ metadata }) {
  return (
    <aside
      className={styles.indicatorsBar}
      data-testid="executive-runtime-audit-indicators"
      aria-label="Executive Runtime Audit Indicators"
    >
      <p className={styles.indicatorsEyebrow}>AIOI-P8.3 · RUNTIME AUDIT LAYER FOUNDATION</p>
      <div className={styles.metricsGrid} role="list" aria-label="Runtime Audit Metrics">
        <div className={styles.metricItem} data-testid="executive-runtime-audit-ready" role="listitem">
          <span className={styles.metricLabel}>Audit Ready</span>
          <span className={styles.metricValue}>{metadata?.audit_ready ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-auditable" role="listitem">
          <span className={styles.metricLabel}>Runtime Auditable</span>
          <span className={styles.metricValue}>{metadata?.runtime_auditable ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-audit-authorized" role="listitem">
          <span className={styles.metricLabel}>Runtime Authorized</span>
          <span className={styles.metricValue}>{metadata?.runtime_authorized ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-audit-enabled" role="listitem">
          <span className={styles.metricLabel}>Runtime Enabled</span>
          <span className={styles.metricValue}>{metadata?.runtime_enabled ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-audit-active" role="listitem">
          <span className={styles.metricLabel}>Runtime Active</span>
          <span className={styles.metricValue}>{metadata?.runtime_active ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-audit-status" role="listitem">
          <span className={styles.metricLabel}>Audit Status</span>
          <span className={styles.metricValue}>{metadata?.audit_status || 'READY'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-audit-mode" role="listitem">
          <span className={styles.metricLabel}>Audit Mode</span>
          <span className={styles.metricValue}>{metadata?.audit_mode || 'FOUNDATION_ONLY'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-audit-version" role="listitem">
          <span className={styles.metricLabel}>Audit Version</span>
          <span className={styles.metricValue}>{metadata?.audit_version || '1.0.0'}</span>
        </div>
      </div>
    </aside>
  );
}

export default ExecutiveRuntimeAuditIndicators;
