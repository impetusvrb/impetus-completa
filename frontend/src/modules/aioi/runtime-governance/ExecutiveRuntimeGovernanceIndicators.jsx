/**
 * AIOI-P8.1 — Executive Runtime Governance Indicators (READ ONLY)
 */

import React from 'react';
import styles from './ExecutiveRuntimeGovernance.module.css';

export function ExecutiveRuntimeGovernanceIndicators({ metadata, runtimeReady }) {
  return (
    <aside
      className={styles.indicatorsBar}
      data-testid="executive-runtime-governance-indicators"
      aria-label="Executive Runtime Governance Indicators"
    >
      <p className={styles.indicatorsEyebrow}>AIOI-P8.1 · RUNTIME GOVERNANCE FOUNDATION</p>
      <div className={styles.metricsGrid} role="list" aria-label="Runtime Governance Metrics">
        <div className={styles.metricItem} data-testid="executive-runtime-governance-ready" role="listitem">
          <span className={styles.metricLabel}>Governance Ready</span>
          <span className={styles.metricValue}>{metadata?.governance_ready ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-authorization-ready" role="listitem">
          <span className={styles.metricLabel}>Authorization Ready</span>
          <span className={styles.metricValue}>{metadata?.authorization_ready ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-audit-ready" role="listitem">
          <span className={styles.metricLabel}>Audit Ready</span>
          <span className={styles.metricValue}>{metadata?.audit_ready ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-governance-runtime-ready" role="listitem">
          <span className={styles.metricLabel}>Runtime Ready</span>
          <span className={styles.metricValue}>{runtimeReady ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-governance-enabled" role="listitem">
          <span className={styles.metricLabel}>Runtime Enabled</span>
          <span className={styles.metricValue}>{metadata?.runtime_enabled ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-governance-active" role="listitem">
          <span className={styles.metricLabel}>Runtime Active</span>
          <span className={styles.metricValue}>{metadata?.runtime_active ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-governance-compliance" role="listitem">
          <span className={styles.metricLabel}>Compliance</span>
          <span className={styles.metricValue}>{metadata?.compliance_status || 'BLOCKED'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-runtime-governance-version" role="listitem">
          <span className={styles.metricLabel}>Governance Version</span>
          <span className={styles.metricValue}>{metadata?.governance_version || '1.0.0'}</span>
        </div>
      </div>
    </aside>
  );
}

export default ExecutiveRuntimeGovernanceIndicators;
