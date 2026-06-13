/**
 * AIOI-P7.0 — Executive Intelligence Metadata (FOUNDATION ONLY · READ ONLY)
 */

import React from 'react';
import styles from './ExecutiveIntelligence.module.css';

export function ExecutiveIntelligenceMetadata({ metadata }) {
  return (
    <aside
      className={styles.metadataBar}
      data-testid="executive-intelligence-metadata"
      aria-label="Executive Intelligence Metadata"
    >
      <p className={styles.metadataEyebrow}>AIOI-P7.0 · INTELLIGENCE FOUNDATION</p>
      <div className={styles.metricsGrid} role="list" aria-label="Intelligence Foundation Metrics">
        <div className={styles.metricItem} data-testid="executive-intelligence-ready" role="listitem">
          <span className={styles.metricLabel}>Intelligence Ready</span>
          <span className={styles.metricValue}>{metadata?.intelligence_ready ? 'yes' : 'no'}</span>
        </div>
        <div className={styles.metricItem} data-testid="executive-intelligence-version" role="listitem">
          <span className={styles.metricLabel}>Intelligence Version</span>
          <span className={styles.metricValue}>{metadata?.intelligence_version || 'P7.0'}</span>
        </div>
      </div>
    </aside>
  );
}

export default ExecutiveIntelligenceMetadata;
