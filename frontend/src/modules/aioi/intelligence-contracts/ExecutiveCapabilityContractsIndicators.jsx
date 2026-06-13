/**
 * AIOI-P7.3 — Executive Capability Contracts Indicators (READ ONLY)
 */

import React from 'react';
import styles from './ExecutiveCapabilityContracts.module.css';

export function ExecutiveCapabilityContractsIndicators({ metadata }) {
  return (
    <aside
      className={styles.indicatorsBar}
      data-testid="executive-capability-contracts-indicators"
      aria-label="Executive Capability Contracts Indicators"
    >
      <p className={styles.indicatorsEyebrow}>AIOI-P7.3 · CAPABILITY CONTRACTS</p>
      <div className={styles.metricsGrid} role="list" aria-label="Capability Contracts Metrics">
        <div className={styles.metricItem} data-testid="executive-capability-contracts-ready" role="listitem">
          <span className={styles.metricLabel}>Contracts Ready</span>
          <span className={styles.metricValue}>{metadata?.contracts_ready ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-capability-insights-available" role="listitem">
          <span className={styles.metricLabel}>Insights Contract Available</span>
          <span className={styles.metricValue}>{metadata?.insights_contract_available ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-capability-recommendations-available" role="listitem">
          <span className={styles.metricLabel}>Recommendations Contract Available</span>
          <span className={styles.metricValue}>{metadata?.recommendations_contract_available ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-capability-assistant-available" role="listitem">
          <span className={styles.metricLabel}>Assistant Contract Available</span>
          <span className={styles.metricValue}>{metadata?.assistant_contract_available ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-capability-contracts-version" role="listitem">
          <span className={styles.metricLabel}>Contracts Version</span>
          <span className={styles.metricValue}>{metadata?.contracts_version || 'P7.3'}</span>
        </div>
      </div>
    </aside>
  );
}

export default ExecutiveCapabilityContractsIndicators;
