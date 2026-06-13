/**
 * AIOI-P8.4 — Executive Insights Runtime Provider (FOUNDATION ONLY · READ ONLY)
 *
 * Publica estado de insights runtime — sem executar runtime cognitivo.
 */

import React, { useMemo } from 'react';
import { useExecutiveCognitiveRuntime } from '../cognitive-runtime/ExecutiveCognitiveRuntimeContext.jsx';
import { useExecutiveRuntimeGovernance } from '../runtime-governance/ExecutiveRuntimeGovernanceContext.jsx';
import { useExecutiveRuntimeAuthorization } from '../runtime-authorization/ExecutiveRuntimeAuthorizationContext.jsx';
import { useExecutiveRuntimeAudit } from '../runtime-audit/ExecutiveRuntimeAuditContext.jsx';
import { ExecutiveInsightsRuntimeContext } from './ExecutiveInsightsRuntimeContext.jsx';
import ExecutiveInsightsRuntimeIndicators from './ExecutiveInsightsRuntimeIndicators.jsx';
import {
  getExecutiveInsightsRuntimeBundle,
  getExecutiveInsightsRuntimeMetadata,
  isExecutiveInsightsRuntimeReady,
  validateExecutiveInsightsRuntimeState
} from './ExecutiveInsightsRuntimeService.js';
import { getExecutiveInsightsRuntimeRegistry } from './ExecutiveInsightsRuntimeRegistry.js';
import styles from './ExecutiveInsightsRuntime.module.css';

/**
 * @param {{ children?: React.ReactNode }} props
 */
export function ExecutiveInsightsRuntimeProvider({ children }) {
  const runtimeContext = useExecutiveCognitiveRuntime();
  const governanceContext = useExecutiveRuntimeGovernance();
  const authorizationContext = useExecutiveRuntimeAuthorization();
  const auditContext = useExecutiveRuntimeAudit();

  const runtimeFoundationReady = runtimeContext?.ready === true;
  const governanceFoundationReady = governanceContext?.governanceReady === true;
  const authorizationFoundationReady = authorizationContext?.authorizationReady === true;
  const auditFoundationReady = auditContext?.auditReady === true;

  const metadata = useMemo(() => getExecutiveInsightsRuntimeMetadata(), []);

  const validation = useMemo(
    () =>
      validateExecutiveInsightsRuntimeState({
        runtimeFoundationReady,
        governanceFoundationReady,
        authorizationFoundationReady,
        auditFoundationReady
      }),
    [runtimeFoundationReady, governanceFoundationReady, authorizationFoundationReady, auditFoundationReady]
  );

  const bundle = useMemo(() => getExecutiveInsightsRuntimeBundle(), []);
  const registry = useMemo(() => getExecutiveInsightsRuntimeRegistry(), []);

  const insightsReady = isExecutiveInsightsRuntimeReady() && validation.valid === true;

  const contextValue = useMemo(
    () => ({
      insightsReady,
      insightsRuntimeAvailable: metadata.insights_runtime_available === true,
      insightsRuntimeEnabled: metadata.insights_runtime_enabled === true,
      insightsRuntimeActive: metadata.insights_runtime_active === true,
      runtimeAuthorized: metadata.runtime_authorized === true,
      runtimeEnabled: metadata.runtime_enabled === true,
      runtimeActive: metadata.runtime_active === true,
      cognitiveExecutionAllowed: metadata.cognitive_execution_allowed === true,
      metadata,
      contracts: {
        insightsContract: bundle.insightsContract,
        consumptionContract: bundle.consumptionContract,
        lifecycleContract: bundle.lifecycleContract
      },
      registry,
      policies: bundle.policy,
      validation
    }),
    [insightsReady, metadata, bundle, registry, validation]
  );

  const authorizationStatus = authorizationContext?.authorizationStatus || 'FOUNDATION_ONLY';
  const auditStatus = auditContext?.auditStatus || 'READY';

  return (
    <ExecutiveInsightsRuntimeContext.Provider value={contextValue}>
      <div
        className={styles.providerShell}
        data-testid="executive-insights-runtime-provider"
        data-insights-ready={insightsReady ? 'true' : 'false'}
        data-insights-runtime-available={metadata.insights_runtime_available ? 'true' : 'false'}
        data-insights-mode={metadata.insights_mode}
        data-insights-status={metadata.insights_status}
        aria-label="Executive Insights Runtime Provider"
      >
        <ExecutiveInsightsRuntimeIndicators
          metadata={metadata}
          authorizationStatus={authorizationStatus}
          auditStatus={auditStatus}
        />
        <div className={styles.providerContent}>{children}</div>
      </div>
    </ExecutiveInsightsRuntimeContext.Provider>
  );
}

export default ExecutiveInsightsRuntimeProvider;
