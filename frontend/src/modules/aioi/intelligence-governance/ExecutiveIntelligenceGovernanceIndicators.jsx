/**
 * AIOI-P7.1 — Executive Intelligence Governance Indicators (READ ONLY)
 */

import React from 'react';
import styles from './ExecutiveIntelligenceGovernance.module.css';

export function ExecutiveIntelligenceGovernanceIndicators({ metadata }) {
  return (
    <aside
      className={styles.indicatorsBar}
      data-testid="executive-intelligence-governance-indicators"
      aria-label="Executive Intelligence Governance Indicators"
    >
      <p className={styles.indicatorsEyebrow}>AIOI-P7.1 · INTELLIGENCE GOVERNANCE</p>
      <div className={styles.metricsGrid} role="list" aria-label="Intelligence Governance Metrics">
        <div className={styles.metricItem} data-testid="executive-intelligence-governance-ready" role="listitem">
          <span className={styles.metricLabel}>Governance Ready</span>
          <span className={styles.metricValue}>{metadata?.governance_ready ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-intelligence-governance-audit-ready" role="listitem">
          <span className={styles.metricLabel}>Audit Ready</span>
          <span className={styles.metricValue}>{metadata?.audit_ready ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-intelligence-governance-governed" role="listitem">
          <span className={styles.metricLabel}>Intelligence Governed</span>
          <span className={styles.metricValue}>{metadata?.intelligence_governed ? 'yes' : 'no'}</span>
        </div>
      </div>
    </aside>
  );
}

export default ExecutiveIntelligenceGovernanceIndicators;
