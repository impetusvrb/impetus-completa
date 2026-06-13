/**
 * AIOI-P8.2 — Executive Runtime Authorization Service (AUTHORIZATION FOUNDATION ONLY · READ ONLY)
 *
 * Fundação institucional de autorização — sem execução, sem inferência.
 */

import { getRuntimeAuthorizationPolicy } from './ExecutiveRuntimeAuthorizationPolicies.js';
import {
  getRuntimeActivationContract,
  getRuntimeAuthorizationContract,
  getRuntimeExecutionContract
} from './ExecutiveRuntimeAuthorizationContracts.js';
import { getExecutiveRuntimeAuthorizationRegistry } from './ExecutiveRuntimeAuthorizationRegistry.js';
import { validateRuntimeAuthorizationFoundation } from './ExecutiveRuntimeAuthorizationValidation.js';

export const EXECUTIVE_RUNTIME_AUTHORIZATION_VERSION = 'P8.2';
export const EXECUTIVE_RUNTIME_AUTHORIZATION_SEMVER = '1.0.0';

/**
 * @returns {{
 *   authorization_ready: boolean,
 *   authorization_version: string,
 *   runtime_authorized: boolean,
 *   runtime_enabled: boolean,
 *   runtime_active: boolean,
 *   authorization_mode: string,
 *   authorization_status: string,
 *   governance_dependency: boolean,
 *   audit_dependency: boolean,
 *   cognitive_execution_allowed: boolean,
 *   registry_count: number
 * }}
 */
export function getExecutiveRuntimeAuthorizationMetadata() {
  return {
    authorization_ready: true,
    authorization_version: EXECUTIVE_RUNTIME_AUTHORIZATION_SEMVER,
    runtime_authorized: false,
    runtime_enabled: false,
    runtime_active: false,
    authorization_mode: 'BLOCKED',
    authorization_status: 'FOUNDATION_ONLY',
    governance_dependency: true,
    audit_dependency: false,
    cognitive_execution_allowed: false,
    registry_count: getExecutiveRuntimeAuthorizationRegistry().length
  };
}

/**
 * @param {{
 *   runtimeFoundationReady?: boolean,
 *   governanceFoundationReady?: boolean
 * }} deps
 * @returns {ReturnType<typeof validateRuntimeAuthorizationFoundation>}
 */
export function validateExecutiveRuntimeAuthorizationState(deps = {}) {
  const metadata = getExecutiveRuntimeAuthorizationMetadata();
  return validateRuntimeAuthorizationFoundation({
    runtimeFoundationReady: deps.runtimeFoundationReady === true,
    governanceFoundationReady: deps.governanceFoundationReady === true,
    hasContracts: true,
    hasPolicies: true,
    registryValid: getExecutiveRuntimeAuthorizationRegistry().length === 4,
    runtimeAuthorized: metadata.runtime_authorized,
    runtimeEnabled: metadata.runtime_enabled,
    runtimeActive: metadata.runtime_active,
    cognitiveExecutionAllowed: metadata.cognitive_execution_allowed
  });
}

/**
 * @returns {boolean}
 */
export function isExecutiveRuntimeAuthorizationReady() {
  return getExecutiveRuntimeAuthorizationMetadata().authorization_ready === true;
}

/**
 * @returns {{
 *   authorizationContract: object,
 *   activationContract: object,
 *   executionContract: object,
 *   policy: object
 * }}
 */
export function getExecutiveRuntimeAuthorizationBundle() {
  return {
    authorizationContract: getRuntimeAuthorizationContract(),
    activationContract: getRuntimeActivationContract(),
    executionContract: getRuntimeExecutionContract(),
    policy: getRuntimeAuthorizationPolicy()
  };
}

export default getExecutiveRuntimeAuthorizationMetadata;
