/**
 * AIOI-P8.6 — Executive Assistant Runtime Provider (FOUNDATION ONLY · READ ONLY)
 *
 * Publica estado de assistant runtime — sem executar runtime cognitivo.
 */

import React, { useMemo } from 'react';
import { useExecutiveCognitiveRuntime } from '../cognitive-runtime/ExecutiveCognitiveRuntimeContext.jsx';
import { useExecutiveRuntimeGovernance } from '../runtime-governance/ExecutiveRuntimeGovernanceContext.jsx';
import { useExecutiveRuntimeAuthorization } from '../runtime-authorization/ExecutiveRuntimeAuthorizationContext.jsx';
import { useExecutiveRuntimeAudit } from '../runtime-audit/ExecutiveRuntimeAuditContext.jsx';
import { useExecutiveInsightsRuntime } from '../insights-runtime/ExecutiveInsightsRuntimeContext.jsx';
import { useExecutiveRecommendationsRuntime } from '../recommendations-runtime/ExecutiveRecommendationsRuntimeContext.jsx';
import { ExecutiveAssistantRuntimeContext } from './ExecutiveAssistantRuntimeContext.jsx';
import ExecutiveAssistantRuntimeIndicators from './ExecutiveAssistantRuntimeIndicators.jsx';
import {
  getExecutiveAssistantRuntimeBundle,
  getExecutiveAssistantRuntimeMetadata,
  isExecutiveAssistantRuntimeReady,
  validateExecutiveAssistantRuntimeState
} from './ExecutiveAssistantRuntimeService.js';
import { getExecutiveAssistantRuntimeRegistry } from './ExecutiveAssistantRuntimeRegistry.js';
import styles from './ExecutiveAssistantRuntime.module.css';

/**
 * @param {{ children?: React.ReactNode }} props
 */
export function ExecutiveAssistantRuntimeProvider({ children }) {
  const runtimeContext = useExecutiveCognitiveRuntime();
  const governanceContext = useExecutiveRuntimeGovernance();
  const authorizationContext = useExecutiveRuntimeAuthorization();
  const auditContext = useExecutiveRuntimeAudit();
  const insightsContext = useExecutiveInsightsRuntime();
  const recommendationsContext = useExecutiveRecommendationsRuntime();

  const runtimeFoundationReady = runtimeContext?.ready === true;
  const governanceFoundationReady = governanceContext?.governanceReady === true;
  const authorizationFoundationReady = authorizationContext?.authorizationReady === true;
  const auditFoundationReady = auditContext?.auditReady === true;
  const insightsFoundationReady = insightsContext?.insightsReady === true;
  const recommendationsFoundationReady = recommendationsContext?.recommendationsReady === true;

  const metadata = useMemo(() => getExecutiveAssistantRuntimeMetadata(), []);

  const validation = useMemo(
    () =>
      validateExecutiveAssistantRuntimeState({
        runtimeFoundationReady,
        governanceFoundationReady,
        authorizationFoundationReady,
        auditFoundationReady,
        insightsFoundationReady,
        recommendationsFoundationReady
      }),
    [
      runtimeFoundationReady,
      governanceFoundationReady,
      authorizationFoundationReady,
      auditFoundationReady,
      insightsFoundationReady,
      recommendationsFoundationReady
    ]
  );

  const bundle = useMemo(() => getExecutiveAssistantRuntimeBundle(), []);
  const registry = useMemo(() => getExecutiveAssistantRuntimeRegistry(), []);

  const assistantReady = isExecutiveAssistantRuntimeReady() && validation.valid === true;

  const contextValue = useMemo(
    () => ({
      assistantReady,
      assistantRuntimeAvailable: metadata.assistant_runtime_available === true,
      assistantRuntimeEnabled: metadata.assistant_runtime_enabled === true,
      assistantRuntimeActive: metadata.assistant_runtime_active === true,
      runtimeAuthorized: metadata.runtime_authorized === true,
      runtimeEnabled: metadata.runtime_enabled === true,
      runtimeActive: metadata.runtime_active === true,
      cognitiveExecutionAllowed: metadata.cognitive_execution_allowed === true,
      metadata,
      contracts: {
        assistantContract: bundle.assistantContract,
        conversationContract: bundle.conversationContract,
        lifecycleContract: bundle.lifecycleContract
      },
      registry,
      policies: bundle.policy,
      validation
    }),
    [assistantReady, metadata, bundle, registry, validation]
  );

  return (
    <ExecutiveAssistantRuntimeContext.Provider value={contextValue}>
      <div
        className={styles.providerShell}
        data-testid="executive-assistant-runtime-provider"
        data-assistant-ready={assistantReady ? 'true' : 'false'}
        data-assistant-runtime-available={metadata.assistant_runtime_available ? 'true' : 'false'}
        data-assistant-mode={metadata.assistant_mode}
        data-assistant-status={metadata.assistant_status}
        aria-label="Executive Assistant Runtime Provider"
      >
        <ExecutiveAssistantRuntimeIndicators metadata={metadata} />
        <div className={styles.providerContent}>{children}</div>
      </div>
    </ExecutiveAssistantRuntimeContext.Provider>
  );
}

export default ExecutiveAssistantRuntimeProvider;
