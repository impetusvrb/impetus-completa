/**
 * AIOI-P8.3 — Executive Runtime Audit Service (AUDIT FOUNDATION ONLY · READ ONLY)
 *
 * Fundação institucional de auditoria — sem execução, sem inferência.
 */

import { getRuntimeAuditPolicy } from './ExecutiveRuntimeAuditPolicies.js';
import {
  getRuntimeAuditContract,
  getRuntimeComplianceContract,
  getRuntimeEvidenceContract
} from './ExecutiveRuntimeAuditContracts.js';
import { getExecutiveRuntimeAuditRegistry } from './ExecutiveRuntimeAuditRegistry.js';
import { validateRuntimeAuditFoundation } from './ExecutiveRuntimeAuditValidation.js';

export const EXECUTIVE_RUNTIME_AUDIT_VERSION = 'P8.3';
export const EXECUTIVE_RUNTIME_AUDIT_SEMVER = '1.0.0';

/**
 * @returns {{
 *   audit_ready: boolean,
 *   audit_version: string,
 *   audit_mode: string,
 *   audit_status: string,
 *   runtime_auditable: boolean,
 *   runtime_authorized: boolean,
 *   runtime_enabled: boolean,
 *   runtime_active: boolean,
 *   cognitive_execution_allowed: boolean,
 *   governance_dependency: boolean,
 *   authorization_dependency: boolean,
 *   registry_count: number
 * }}
 */
export function getExecutiveRuntimeAuditMetadata() {
  return {
    audit_ready: true,
    audit_version: EXECUTIVE_RUNTIME_AUDIT_SEMVER,
    audit_mode: 'FOUNDATION_ONLY',
    audit_status: 'READY',
    runtime_auditable: true,
    runtime_authorized: false,
    runtime_enabled: false,
    runtime_active: false,
    cognitive_execution_allowed: false,
    governance_dependency: true,
    authorization_dependency: true,
    registry_count: getExecutiveRuntimeAuditRegistry().length
  };
}

/**
 * @param {{
 *   runtimeFoundationReady?: boolean,
 *   governanceFoundationReady?: boolean,
 *   authorizationFoundationReady?: boolean
 * }} deps
 * @returns {ReturnType<typeof validateRuntimeAuditFoundation>}
 */
export function validateExecutiveRuntimeAuditState(deps = {}) {
  const metadata = getExecutiveRuntimeAuditMetadata();
  return validateRuntimeAuditFoundation({
    runtimeFoundationReady: deps.runtimeFoundationReady === true,
    governanceFoundationReady: deps.governanceFoundationReady === true,
    authorizationFoundationReady: deps.authorizationFoundationReady === true,
    hasContracts: true,
    hasPolicies: true,
    registryValid: getExecutiveRuntimeAuditRegistry().length === 3,
    runtimeAuthorized: metadata.runtime_authorized,
    runtimeEnabled: metadata.runtime_enabled,
    runtimeActive: metadata.runtime_active,
    cognitiveExecutionAllowed: metadata.cognitive_execution_allowed
  });
}

/**
 * @returns {boolean}
 */
export function isExecutiveRuntimeAuditReady() {
  return getExecutiveRuntimeAuditMetadata().audit_ready === true;
}

/**
 * @returns {{
 *   auditContract: object,
 *   evidenceContract: object,
 *   complianceContract: object,
 *   policy: object
 * }}
 */
export function getExecutiveRuntimeAuditBundle() {
  return {
    auditContract: getRuntimeAuditContract(),
    evidenceContract: getRuntimeEvidenceContract(),
    complianceContract: getRuntimeComplianceContract(),
    policy: getRuntimeAuditPolicy()
  };
}

export default getExecutiveRuntimeAuditMetadata;
