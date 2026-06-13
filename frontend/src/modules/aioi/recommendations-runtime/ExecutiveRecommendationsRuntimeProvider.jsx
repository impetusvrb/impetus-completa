/**
 * AIOI-P8.5 — Executive Recommendations Runtime Provider (FOUNDATION ONLY · READ ONLY)
 *
 * Publica estado de recommendations runtime — sem executar runtime cognitivo.
 */

import React, { useMemo } from 'react';
import { useExecutiveCognitiveRuntime } from '../cognitive-runtime/ExecutiveCognitiveRuntimeContext.jsx';
import { useExecutiveRuntimeGovernance } from '../runtime-governance/ExecutiveRuntimeGovernanceContext.jsx';
import { useExecutiveRuntimeAuthorization } from '../runtime-authorization/ExecutiveRuntimeAuthorizationContext.jsx';
import { useExecutiveRuntimeAudit } from '../runtime-audit/ExecutiveRuntimeAuditContext.jsx';
import { useExecutiveInsightsRuntime } from '../insights-runtime/ExecutiveInsightsRuntimeContext.jsx';
import { ExecutiveRecommendationsRuntimeContext } from './ExecutiveRecommendationsRuntimeContext.jsx';
import ExecutiveRecommendationsRuntimeIndicators from './ExecutiveRecommendationsRuntimeIndicators.jsx';
import {
  getExecutiveRecommendationsRuntimeBundle,
  getExecutiveRecommendationsRuntimeMetadata,
  isExecutiveRecommendationsRuntimeReady,
  validateExecutiveRecommendationsRuntimeState
} from './ExecutiveRecommendationsRuntimeService.js';
import { getExecutiveRecommendationsRuntimeRegistry } from './ExecutiveRecommendationsRuntimeRegistry.js';
import styles from './ExecutiveRecommendationsRuntime.module.css';

/**
 * @param {{ children?: React.ReactNode }} props
 */
export function ExecutiveRecommendationsRuntimeProvider({ children }) {
  const runtimeContext = useExecutiveCognitiveRuntime();
  const governanceContext = useExecutiveRuntimeGovernance();
  const authorizationContext = useExecutiveRuntimeAuthorization();
  const auditContext = useExecutiveRuntimeAudit();
  const insightsContext = useExecutiveInsightsRuntime();

  const runtimeFoundationReady = runtimeContext?.ready === true;
  const governanceFoundationReady = governanceContext?.governanceReady === true;
  const authorizationFoundationReady = authorizationContext?.authorizationReady === true;
  const auditFoundationReady = auditContext?.auditReady === true;
  const insightsFoundationReady = insightsContext?.insightsReady === true;

  const metadata = useMemo(() => getExecutiveRecommendationsRuntimeMetadata(), []);

  const validation = useMemo(
    () =>
      validateExecutiveRecommendationsRuntimeState({
        runtimeFoundationReady,
        governanceFoundationReady,
        authorizationFoundationReady,
        auditFoundationReady,
        insightsFoundationReady
      }),
    [
      runtimeFoundationReady,
      governanceFoundationReady,
      authorizationFoundationReady,
      auditFoundationReady,
      insightsFoundationReady
    ]
  );

  const bundle = useMemo(() => getExecutiveRecommendationsRuntimeBundle(), []);
  const registry = useMemo(() => getExecutiveRecommendationsRuntimeRegistry(), []);

  const recommendationsReady = isExecutiveRecommendationsRuntimeReady() && validation.valid === true;

  const contextValue = useMemo(
    () => ({
      recommendationsReady,
      recommendationsRuntimeAvailable: metadata.recommendations_runtime_available === true,
      recommendationsRuntimeEnabled: metadata.recommendations_runtime_enabled === true,
      recommendationsRuntimeActive: metadata.recommendations_runtime_active === true,
      runtimeAuthorized: metadata.runtime_authorized === true,
      runtimeEnabled: metadata.runtime_enabled === true,
      runtimeActive: metadata.runtime_active === true,
      cognitiveExecutionAllowed: metadata.cognitive_execution_allowed === true,
      metadata,
      contracts: {
        recommendationsContract: bundle.recommendationsContract,
        consumptionContract: bundle.consumptionContract,
        lifecycleContract: bundle.lifecycleContract
      },
      registry,
      policies: bundle.policy,
      validation
    }),
    [recommendationsReady, metadata, bundle, registry, validation]
  );

  return (
    <ExecutiveRecommendationsRuntimeContext.Provider value={contextValue}>
      <div
        className={styles.providerShell}
        data-testid="executive-recommendations-runtime-provider"
        data-recommendations-ready={recommendationsReady ? 'true' : 'false'}
        data-recommendations-runtime-available={metadata.recommendations_runtime_available ? 'true' : 'false'}
        data-recommendations-mode={metadata.recommendations_mode}
        data-recommendations-status={metadata.recommendations_status}
        aria-label="Executive Recommendations Runtime Provider"
      >
        <ExecutiveRecommendationsRuntimeIndicators metadata={metadata} />
        <div className={styles.providerContent}>{children}</div>
      </div>
    </ExecutiveRecommendationsRuntimeContext.Provider>
  );
}

export default ExecutiveRecommendationsRuntimeProvider;
