/**
 * AIOI-P7.5 — Executive Recommendations Foundation Provider (FOUNDATION ONLY · READ ONLY)
 *
 * Consome recommendationsContract P7.3 via useExecutiveCapabilityContracts — sem runtime cognitivo.
 */

import React, { useMemo } from 'react';
import { useExecutiveCapabilityContracts } from '../intelligence-contracts/ExecutiveCapabilityContractsContext.jsx';
import { ExecutiveRecommendationsFoundationContext } from './ExecutiveRecommendationsFoundationContext.jsx';
import ExecutiveRecommendationsFoundationIndicators from './ExecutiveRecommendationsFoundationIndicators.jsx';
import {
  getExecutiveRecommendationsFoundationMetadata,
  isExecutiveRecommendationsContractLinked,
  isExecutiveRecommendationsFoundationReady
} from './ExecutiveRecommendationsFoundationService.js';
import styles from './ExecutiveRecommendationsFoundation.module.css';

/**
 * @param {{ children?: React.ReactNode }} props
 */
export function ExecutiveRecommendationsFoundationProvider({ children }) {
  const contractsContext = useExecutiveCapabilityContracts();
  const recommendationsContract = contractsContext?.recommendationsContract;

  const contractLinked = isExecutiveRecommendationsContractLinked(recommendationsContract);
  const ready = isExecutiveRecommendationsFoundationReady();
  const available = recommendationsContract?.available === true;

  const metadata = useMemo(() => {
    const base = getExecutiveRecommendationsFoundationMetadata();
    return {
      ...base,
      recommendations_contract_linked: contractLinked,
      recommendations_available: available
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
    <ExecutiveRecommendationsFoundationContext.Provider value={contextValue}>
      <div
        className={styles.providerShell}
        data-testid="executive-recommendations-foundation-provider"
        data-recommendations-ready={ready ? 'true' : 'false'}
        data-recommendations-contract-linked={contractLinked ? 'true' : 'false'}
        aria-label="Executive Recommendations Foundation Provider"
      >
        <ExecutiveRecommendationsFoundationIndicators metadata={metadata} />
        <div className={styles.providerContent}>{children}</div>
      </div>
    </ExecutiveRecommendationsFoundationContext.Provider>
  );
}

export default ExecutiveRecommendationsFoundationProvider;
