/**
 * AIOI-P8.2 — Executive Runtime Authorization Provider (AUTHORIZATION FOUNDATION ONLY · READ ONLY)
 *
 * Publica estado de autorização — sem executar runtime cognitivo.
 */

import React, { useMemo } from 'react';
import { useExecutiveCognitiveRuntime } from '../cognitive-runtime/ExecutiveCognitiveRuntimeContext.jsx';
import { useExecutiveRuntimeGovernance } from '../runtime-governance/ExecutiveRuntimeGovernanceContext.jsx';
import { ExecutiveRuntimeAuthorizationContext } from './ExecutiveRuntimeAuthorizationContext.jsx';
import ExecutiveRuntimeAuthorizationIndicators from './ExecutiveRuntimeAuthorizationIndicators.jsx';
import {
  getExecutiveRuntimeAuthorizationBundle,
  getExecutiveRuntimeAuthorizationMetadata,
  isExecutiveRuntimeAuthorizationReady,
  validateExecutiveRuntimeAuthorizationState
} from './ExecutiveRuntimeAuthorizationService.js';
import { getExecutiveRuntimeAuthorizationRegistry } from './ExecutiveRuntimeAuthorizationRegistry.js';
import styles from './ExecutiveRuntimeAuthorization.module.css';

/**
 * @param {{ children?: React.ReactNode }} props
 */
export function ExecutiveRuntimeAuthorizationProvider({ children }) {
  const runtimeContext = useExecutiveCognitiveRuntime();
  const governanceContext = useExecutiveRuntimeGovernance();

  const runtimeFoundationReady = runtimeContext?.ready === true;
  const governanceFoundationReady = governanceContext?.governanceReady === true;

  const metadata = useMemo(() => getExecutiveRuntimeAuthorizationMetadata(), []);

  const validation = useMemo(
    () =>
      validateExecutiveRuntimeAuthorizationState({
        runtimeFoundationReady,
        governanceFoundationReady
      }),
    [runtimeFoundationReady, governanceFoundationReady]
  );

  const bundle = useMemo(() => getExecutiveRuntimeAuthorizationBundle(), []);
  const registry = useMemo(() => getExecutiveRuntimeAuthorizationRegistry(), []);

  const authorizationReady = isExecutiveRuntimeAuthorizationReady() && validation.valid === true;

  const contextValue = useMemo(
    () => ({
      authorizationReady,
      authorizationVersion: metadata.authorization_version,
      runtimeAuthorized: metadata.runtime_authorized === true,
      runtimeEnabled: metadata.runtime_enabled === true,
      runtimeActive: metadata.runtime_active === true,
      authorizationMode: metadata.authorization_mode,
      authorizationStatus: metadata.authorization_status,
      metadata,
      policies: bundle.policy,
      contracts: {
        authorizationContract: bundle.authorizationContract,
        activationContract: bundle.activationContract,
        executionContract: bundle.executionContract
      },
      registry,
      validation
    }),
    [authorizationReady, metadata, bundle, registry, validation]
  );

  return (
    <ExecutiveRuntimeAuthorizationContext.Provider value={contextValue}>
      <div
        className={styles.providerShell}
        data-testid="executive-runtime-authorization-provider"
        data-authorization-ready={authorizationReady ? 'true' : 'false'}
        data-runtime-authorized={metadata.runtime_authorized ? 'true' : 'false'}
        data-authorization-mode={metadata.authorization_mode}
        data-authorization-status={metadata.authorization_status}
        aria-label="Executive Runtime Authorization Provider"
      >
        <ExecutiveRuntimeAuthorizationIndicators metadata={metadata} />
        <div className={styles.providerContent}>{children}</div>
      </div>
    </ExecutiveRuntimeAuthorizationContext.Provider>
  );
}

export default ExecutiveRuntimeAuthorizationProvider;
