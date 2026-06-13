/**
 * AIOI-P7.1 — Executive Intelligence Governance Provider (GOVERNANCE ONLY · READ ONLY)
 *
 * Governança institucional da camada de inteligência — sem ativação cognitiva.
 */

import React, { useMemo } from 'react';
import { ExecutiveIntelligenceGovernanceContext } from './ExecutiveIntelligenceGovernanceContext.jsx';
import ExecutiveIntelligenceGovernanceIndicators from './ExecutiveIntelligenceGovernanceIndicators.jsx';
import {
  getExecutiveIntelligenceGovernanceMetadata,
  isExecutiveIntelligenceGovernanceReady
} from './ExecutiveIntelligenceGovernanceService.js';
import styles from './ExecutiveIntelligenceGovernance.module.css';

/**
 * @param {{ children?: React.ReactNode }} props
 */
export function ExecutiveIntelligenceGovernanceProvider({ children }) {
  const metadata = useMemo(() => getExecutiveIntelligenceGovernanceMetadata(), []);
  const ready = isExecutiveIntelligenceGovernanceReady();
  const governed = metadata.intelligence_governed === true;

  const contextValue = useMemo(
    () => ({
      metadata,
      governed,
      ready
    }),
    [metadata, governed, ready]
  );

  return (
    <ExecutiveIntelligenceGovernanceContext.Provider value={contextValue}>
      <div
        className={styles.providerShell}
        data-testid="executive-intelligence-governance-provider"
        data-governance-ready={ready ? 'true' : 'false'}
        data-intelligence-governed={governed ? 'true' : 'false'}
        aria-label="Executive Intelligence Governance Provider"
      >
        <ExecutiveIntelligenceGovernanceIndicators metadata={metadata} />
        <div className={styles.providerContent}>{children}</div>
      </div>
    </ExecutiveIntelligenceGovernanceContext.Provider>
  );
}

export default ExecutiveIntelligenceGovernanceProvider;
