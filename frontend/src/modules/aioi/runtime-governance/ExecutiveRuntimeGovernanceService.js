/**
 * AIOI-P8.1 — Executive Runtime Governance Service (GOVERNANCE FOUNDATION ONLY · READ ONLY)
 *
 * Políticas, estados e readiness do runtime — sem inferência, sem execução.
 */

import { getExecutiveRuntimeGovernanceRegistry } from './ExecutiveRuntimeGovernanceRegistry.js';
import {
  getRuntimeAuditContract,
  getRuntimeAuthorizationContract,
  getRuntimeGovernanceContract
} from './ExecutiveRuntimeGovernanceContracts.js';
import { validateExecutiveRuntimeGovernanceRequirements } from './ExecutiveRuntimeGovernanceValidation.js';

export const EXECUTIVE_RUNTIME_GOVERNANCE_VERSION = 'P8.1';
export const EXECUTIVE_RUNTIME_GOVERNANCE_SEMVER = '1.0.0';

/**
 * @returns {{
 *   governance_ready: boolean,
 *   governance_version: string,
 *   authorization_ready: boolean,
 *   audit_ready: boolean,
 *   runtime_authorized: boolean,
 *   runtime_auditable: boolean,
 *   runtime_enabled: boolean,
 *   runtime_active: boolean,
 *   compliance_status: string,
 *   registry_count: number
 * }}
 */
export function getExecutiveRuntimeGovernanceMetadata() {
  return {
    governance_ready: true,
    governance_version: EXECUTIVE_RUNTIME_GOVERNANCE_SEMVER,
    authorization_ready: false,
    audit_ready: false,
    runtime_authorized: false,
    runtime_auditable: false,
    runtime_enabled: false,
    runtime_active: false,
    compliance_status: 'BLOCKED',
    registry_count: getExecutiveRuntimeGovernanceRegistry().length
  };
}

/**
 * @param {{
 *   runtimeFoundationReady?: boolean,
 *   capabilityContractsReady?: boolean
 * }} deps
 * @returns {ReturnType<typeof validateExecutiveRuntimeGovernanceRequirements>}
 */
export function validateExecutiveRuntimeGovernanceState(deps = {}) {
  const metadata = getExecutiveRuntimeGovernanceMetadata();
  return validateExecutiveRuntimeGovernanceRequirements({
    runtimeFoundationReady: deps.runtimeFoundationReady === true,
    capabilityContractsReady: deps.capabilityContractsReady === true,
    runtimeEnabled: metadata.runtime_enabled,
    runtimeActive: metadata.runtime_active,
    runtimeAuthorized: metadata.runtime_authorized
  });
}

/**
 * @returns {boolean}
 */
export function isExecutiveRuntimeGovernanceReady() {
  return getExecutiveRuntimeGovernanceMetadata().governance_ready === true;
}

/**
 * @returns {{
 *   governanceContract: object,
 *   authorizationContract: object,
 *   auditContract: object
 * }}
 */
export function getExecutiveRuntimeGovernanceContractsBundle() {
  return {
    governanceContract: getRuntimeGovernanceContract(),
    authorizationContract: getRuntimeAuthorizationContract(),
    auditContract: getRuntimeAuditContract()
  };
}

export default getExecutiveRuntimeGovernanceMetadata;
