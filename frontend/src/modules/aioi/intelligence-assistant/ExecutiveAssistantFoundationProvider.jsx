/**
 * AIOI-P7.6 — Executive Assistant Foundation Provider (FOUNDATION ONLY · READ ONLY)
 *
 * Consome assistantContract P7.3 via useExecutiveCapabilityContracts — sem runtime cognitivo.
 */

import React, { useMemo } from 'react';
import { useExecutiveCapabilityContracts } from '../intelligence-contracts/ExecutiveCapabilityContractsContext.jsx';
import { ExecutiveAssistantFoundationContext } from './ExecutiveAssistantFoundationContext.jsx';
import ExecutiveAssistantFoundationIndicators from './ExecutiveAssistantFoundationIndicators.jsx';
import {
  getExecutiveAssistantFoundationMetadata,
  isExecutiveAssistantContractLinked,
  isExecutiveAssistantFoundationReady
} from './ExecutiveAssistantFoundationService.js';
import styles from './ExecutiveAssistantFoundation.module.css';

/**
 * @param {{ children?: React.ReactNode }} props
 */
export function ExecutiveAssistantFoundationProvider({ children }) {
  const contractsContext = useExecutiveCapabilityContracts();
  const assistantContract = contractsContext?.assistantContract;

  const contractLinked = isExecutiveAssistantContractLinked(assistantContract);
  const ready = isExecutiveAssistantFoundationReady();
  const available = assistantContract?.available === true;

  const metadata = useMemo(() => {
    const base = getExecutiveAssistantFoundationMetadata();
    return {
      ...base,
      assistant_contract_linked: contractLinked,
      assistant_available: available
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
    <ExecutiveAssistantFoundationContext.Provider value={contextValue}>
      <div
        className={styles.providerShell}
        data-testid="executive-assistant-foundation-provider"
        data-assistant-ready={ready ? 'true' : 'false'}
        data-assistant-contract-linked={contractLinked ? 'true' : 'false'}
        aria-label="Executive Assistant Foundation Provider"
      >
        <ExecutiveAssistantFoundationIndicators metadata={metadata} />
        <div className={styles.providerContent}>{children}</div>
      </div>
    </ExecutiveAssistantFoundationContext.Provider>
  );
}

export default ExecutiveAssistantFoundationProvider;
