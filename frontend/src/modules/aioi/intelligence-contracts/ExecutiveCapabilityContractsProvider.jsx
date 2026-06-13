/**
 * AIOI-P7.3 — Executive Capability Contracts Provider (CONTRACTS ONLY · READ ONLY)
 *
 * Exposição institucional de contratos — sem runtime cognitivo.
 */

import React, { useMemo } from 'react';
import { ExecutiveCapabilityContractsContext } from './ExecutiveCapabilityContractsContext.jsx';
import ExecutiveCapabilityContractsIndicators from './ExecutiveCapabilityContractsIndicators.jsx';
import {
  areExecutiveCapabilityContractsReady,
  getExecutiveAssistantContract,
  getExecutiveCapabilityContractsMetadata,
  getExecutiveInsightsContract,
  getExecutiveRecommendationsContract
} from './ExecutiveCapabilityContractsService.js';
import styles from './ExecutiveCapabilityContracts.module.css';

/**
 * @param {{ children?: React.ReactNode }} props
 */
export function ExecutiveCapabilityContractsProvider({ children }) {
  const metadata = useMemo(() => getExecutiveCapabilityContractsMetadata(), []);
  const insightsContract = useMemo(() => getExecutiveInsightsContract(), []);
  const recommendationsContract = useMemo(() => getExecutiveRecommendationsContract(), []);
  const assistantContract = useMemo(() => getExecutiveAssistantContract(), []);
  const ready = areExecutiveCapabilityContractsReady();

  const contextValue = useMemo(
    () => ({
      metadata,
      insightsContract,
      recommendationsContract,
      assistantContract,
      ready
    }),
    [metadata, insightsContract, recommendationsContract, assistantContract, ready]
  );

  return (
    <ExecutiveCapabilityContractsContext.Provider value={contextValue}>
      <div
        className={styles.providerShell}
        data-testid="executive-capability-contracts-provider"
        data-contracts-ready={ready ? 'true' : 'false'}
        aria-label="Executive Capability Contracts Provider"
      >
        <ExecutiveCapabilityContractsIndicators metadata={metadata} />
        <div className={styles.providerContent}>{children}</div>
      </div>
    </ExecutiveCapabilityContractsContext.Provider>
  );
}

export default ExecutiveCapabilityContractsProvider;
