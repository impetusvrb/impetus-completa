/**
 * AIOI-P7.4 — Executive Insights Foundation Provider (FOUNDATION ONLY · READ ONLY)
 *
 * Consome contrato P7.3 via useExecutiveCapabilityContracts — sem runtime cognitivo.
 */

import React, { useMemo } from 'react';
import { useExecutiveCapabilityContracts } from '../intelligence-contracts/ExecutiveCapabilityContractsContext.jsx';
import { ExecutiveInsightsFoundationContext } from './ExecutiveInsightsFoundationContext.jsx';
import ExecutiveInsightsFoundationIndicators from './ExecutiveInsightsFoundationIndicators.jsx';
import {
  getExecutiveInsightsFoundationMetadata,
  isExecutiveInsightsContractLinked,
  isExecutiveInsightsFoundationReady
} from './ExecutiveInsightsFoundationService.js';
import styles from './ExecutiveInsightsFoundation.module.css';

/**
 * @param {{ children?: React.ReactNode }} props
 */
export function ExecutiveInsightsFoundationProvider({ children }) {
  const contractsContext = useExecutiveCapabilityContracts();
  const insightsContract = contractsContext?.insightsContract;

  const contractLinked = isExecutiveInsightsContractLinked(insightsContract);
  const ready = isExecutiveInsightsFoundationReady();
  const available = insightsContract?.available === true;

  const metadata = useMemo(() => {
    const base = getExecutiveInsightsFoundationMetadata();
    return {
      ...base,
      insights_contract_linked: contractLinked,
      insights_available: available
    };
  }, [contractLinked, available]);

  const contextValue = useMemo(
    () => ({
      metadata,
      ready,
      available,
      contractLinked
    }),
    [metadata, ready, available, contractLinked]
  );

  return (
    <ExecutiveInsightsFoundationContext.Provider value={contextValue}>
      <div
        className={styles.providerShell}
        data-testid="executive-insights-foundation-provider"
        data-insights-ready={ready ? 'true' : 'false'}
        data-insights-contract-linked={contractLinked ? 'true' : 'false'}
        aria-label="Executive Insights Foundation Provider"
      >
        <ExecutiveInsightsFoundationIndicators metadata={metadata} />
        <div className={styles.providerContent}>{children}</div>
      </div>
    </ExecutiveInsightsFoundationContext.Provider>
  );
}

export default ExecutiveInsightsFoundationProvider;
