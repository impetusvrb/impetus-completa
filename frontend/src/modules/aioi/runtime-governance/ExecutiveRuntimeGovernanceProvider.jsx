/**
 * AIOI-P8.1 — Executive Runtime Governance Provider (GOVERNANCE FOUNDATION ONLY · READ ONLY)
 *
 * Publica estado de governança — sem executar runtime cognitivo.
 */

import React, { useMemo } from 'react';
import { useExecutiveCognitiveRuntime } from '../cognitive-runtime/ExecutiveCognitiveRuntimeContext.jsx';
import { useExecutiveCapabilityContracts } from '../intelligence-contracts/ExecutiveCapabilityContractsContext.jsx';
import { ExecutiveRuntimeGovernanceContext } from './ExecutiveRuntimeGovernanceContext.jsx';
import ExecutiveRuntimeGovernanceIndicators from './ExecutiveRuntimeGovernanceIndicators.jsx';
import {
  getExecutiveRuntimeGovernanceContractsBundle,
  getExecutiveRuntimeGovernanceMetadata,
  isExecutiveRuntimeGovernanceReady,
  validateExecutiveRuntimeGovernanceState
} from './ExecutiveRuntimeGovernanceService.js';
import { getExecutiveRuntimeGovernanceRegistry } from './ExecutiveRuntimeGovernanceRegistry.js';
import styles from './ExecutiveRuntimeGovernance.module.css';

/**
 * @param {{ children?: React.ReactNode }} props
 */
export function ExecutiveRuntimeGovernanceProvider({ children }) {
  const runtimeContext = useExecutiveCognitiveRuntime();
  const contractsContext = useExecutiveCapabilityContracts();

  const runtimeFoundationReady = runtimeContext?.ready === true;
  const capabilityContractsReady = contractsContext?.ready === true;
  const runtimeReady = runtimeContext?.metadata?.runtime_ready === true;

  const metadata = useMemo(() => getExecutiveRuntimeGovernanceMetadata(), []);

  const validation = useMemo(
    () =>
      validateExecutiveRuntimeGovernanceState({
        runtimeFoundationReady,
        capabilityContractsReady
      }),
    [runtimeFoundationReady, capabilityContractsReady]
  );

  const contracts = useMemo(() => getExecutiveRuntimeGovernanceContractsBundle(), []);
  const registry = useMemo(() => getExecutiveRuntimeGovernanceRegistry(), []);

  const governanceReady = isExecutiveRuntimeGovernanceReady() && validation.valid === true;

  const contextValue = useMemo(
    () => ({
      governanceReady,
      governanceVersion: metadata.governance_version,
      runtimeAuthorized: metadata.runtime_authorized === true,
      runtimeAuditable: metadata.runtime_auditable === true,
      runtimeEnabled: metadata.runtime_enabled === true,
      runtimeActive: metadata.runtime_active === true,
      complianceStatus: metadata.compliance_status,
      metadata,
      validation,
      contracts,
      registry
    }),
    [governanceReady, metadata, validation, contracts, registry]
  );

  return (
    <ExecutiveRuntimeGovernanceContext.Provider value={contextValue}>
      <div
        className={styles.providerShell}
        data-testid="executive-runtime-governance-provider"
        data-governance-ready={governanceReady ? 'true' : 'false'}
        data-runtime-authorized={metadata.runtime_authorized ? 'true' : 'false'}
        data-runtime-auditable={metadata.runtime_auditable ? 'true' : 'false'}
        data-compliance-status={metadata.compliance_status}
        aria-label="Executive Runtime Governance Provider"
      >
        <ExecutiveRuntimeGovernanceIndicators metadata={metadata} runtimeReady={runtimeReady} />
        <div className={styles.providerContent}>{children}</div>
      </div>
    </ExecutiveRuntimeGovernanceContext.Provider>
  );
}

export default ExecutiveRuntimeGovernanceProvider;
