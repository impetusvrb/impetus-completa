/**
 * AIOI-P8.3 — Executive Runtime Audit Provider (AUDIT FOUNDATION ONLY · READ ONLY)
 *
 * Publica estado de auditoria — sem executar runtime cognitivo.
 */

import React, { useMemo } from 'react';
import { useExecutiveCognitiveRuntime } from '../cognitive-runtime/ExecutiveCognitiveRuntimeContext.jsx';
import { useExecutiveRuntimeGovernance } from '../runtime-governance/ExecutiveRuntimeGovernanceContext.jsx';
import { useExecutiveRuntimeAuthorization } from '../runtime-authorization/ExecutiveRuntimeAuthorizationContext.jsx';
import { ExecutiveRuntimeAuditContext } from './ExecutiveRuntimeAuditContext.jsx';
import ExecutiveRuntimeAuditIndicators from './ExecutiveRuntimeAuditIndicators.jsx';
import {
  getExecutiveRuntimeAuditBundle,
  getExecutiveRuntimeAuditMetadata,
  isExecutiveRuntimeAuditReady,
  validateExecutiveRuntimeAuditState
} from './ExecutiveRuntimeAuditService.js';
import { getExecutiveRuntimeAuditRegistry } from './ExecutiveRuntimeAuditRegistry.js';
import styles from './ExecutiveRuntimeAudit.module.css';

/**
 * @param {{ children?: React.ReactNode }} props
 */
export function ExecutiveRuntimeAuditProvider({ children }) {
  const runtimeContext = useExecutiveCognitiveRuntime();
  const governanceContext = useExecutiveRuntimeGovernance();
  const authorizationContext = useExecutiveRuntimeAuthorization();

  const runtimeFoundationReady = runtimeContext?.ready === true;
  const governanceFoundationReady = governanceContext?.governanceReady === true;
  const authorizationFoundationReady = authorizationContext?.authorizationReady === true;

  const metadata = useMemo(() => getExecutiveRuntimeAuditMetadata(), []);

  const validation = useMemo(
    () =>
      validateExecutiveRuntimeAuditState({
        runtimeFoundationReady,
        governanceFoundationReady,
        authorizationFoundationReady
      }),
    [runtimeFoundationReady, governanceFoundationReady, authorizationFoundationReady]
  );

  const bundle = useMemo(() => getExecutiveRuntimeAuditBundle(), []);
  const registry = useMemo(() => getExecutiveRuntimeAuditRegistry(), []);

  const auditReady = isExecutiveRuntimeAuditReady() && validation.valid === true;

  const contextValue = useMemo(
    () => ({
      auditReady,
      auditVersion: metadata.audit_version,
      runtimeAuditable: metadata.runtime_auditable === true,
      runtimeAuthorized: metadata.runtime_authorized === true,
      runtimeEnabled: metadata.runtime_enabled === true,
      runtimeActive: metadata.runtime_active === true,
      auditMode: metadata.audit_mode,
      auditStatus: metadata.audit_status,
      metadata,
      policies: bundle.policy,
      contracts: {
        auditContract: bundle.auditContract,
        evidenceContract: bundle.evidenceContract,
        complianceContract: bundle.complianceContract
      },
      registry,
      validation
    }),
    [auditReady, metadata, bundle, registry, validation]
  );

  return (
    <ExecutiveRuntimeAuditContext.Provider value={contextValue}>
      <div
        className={styles.providerShell}
        data-testid="executive-runtime-audit-provider"
        data-audit-ready={auditReady ? 'true' : 'false'}
        data-runtime-auditable={metadata.runtime_auditable ? 'true' : 'false'}
        data-audit-mode={metadata.audit_mode}
        data-audit-status={metadata.audit_status}
        aria-label="Executive Runtime Audit Provider"
      >
        <ExecutiveRuntimeAuditIndicators metadata={metadata} />
        <div className={styles.providerContent}>{children}</div>
      </div>
    </ExecutiveRuntimeAuditContext.Provider>
  );
}

export default ExecutiveRuntimeAuditProvider;
