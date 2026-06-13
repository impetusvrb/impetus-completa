/**
 * AIOI-P8.6 — Executive Assistant Runtime Service (FOUNDATION ONLY · READ ONLY)
 *
 * Fundação institucional de assistant runtime — sem execução, sem inferência.
 */

import { getRuntimeAssistantPolicy } from './ExecutiveAssistantRuntimePolicies.js';
import {
  getRuntimeAssistantContract,
  getRuntimeAssistantConversationContract,
  getRuntimeAssistantLifecycleContract
} from './ExecutiveAssistantRuntimeContracts.js';
import { getExecutiveAssistantRuntimeRegistry } from './ExecutiveAssistantRuntimeRegistry.js';
import { validateAssistantRuntimeFoundation } from './ExecutiveAssistantRuntimeValidation.js';

export const EXECUTIVE_ASSISTANT_RUNTIME_VERSION = 'P8.6';

/**
 * @returns {{
 *   assistant_ready: boolean,
 *   assistant_runtime_available: boolean,
 *   assistant_runtime_enabled: boolean,
 *   assistant_runtime_active: boolean,
 *   runtime_authorized: boolean,
 *   runtime_enabled: boolean,
 *   runtime_active: boolean,
 *   cognitive_execution_allowed: boolean,
 *   assistant_mode: string,
 *   assistant_status: string,
 *   governance_dependency: boolean,
 *   authorization_dependency: boolean,
 *   audit_dependency: boolean,
 *   insights_dependency: boolean,
 *   recommendations_dependency: boolean,
 *   registry_count: number
 * }}
 */
export function getExecutiveAssistantRuntimeMetadata() {
  return {
    assistant_ready: true,
    assistant_runtime_available: true,
    assistant_runtime_enabled: false,
    assistant_runtime_active: false,
    runtime_authorized: false,
    runtime_enabled: false,
    runtime_active: false,
    cognitive_execution_allowed: false,
    assistant_mode: 'FOUNDATION_ONLY',
    assistant_status: 'READY',
    governance_dependency: true,
    authorization_dependency: true,
    audit_dependency: true,
    insights_dependency: true,
    recommendations_dependency: true,
    registry_count: getExecutiveAssistantRuntimeRegistry().length
  };
}

/**
 * @param {{
 *   runtimeFoundationReady?: boolean,
 *   governanceFoundationReady?: boolean,
 *   authorizationFoundationReady?: boolean,
 *   auditFoundationReady?: boolean,
 *   insightsFoundationReady?: boolean,
 *   recommendationsFoundationReady?: boolean
 * }} deps
 * @returns {ReturnType<typeof validateAssistantRuntimeFoundation>}
 */
export function validateExecutiveAssistantRuntimeState(deps = {}) {
  const metadata = getExecutiveAssistantRuntimeMetadata();
  return validateAssistantRuntimeFoundation({
    runtimeFoundationReady: deps.runtimeFoundationReady === true,
    governanceFoundationReady: deps.governanceFoundationReady === true,
    authorizationFoundationReady: deps.authorizationFoundationReady === true,
    auditFoundationReady: deps.auditFoundationReady === true,
    insightsFoundationReady: deps.insightsFoundationReady === true,
    recommendationsFoundationReady: deps.recommendationsFoundationReady === true,
    hasContracts: true,
    hasPolicies: true,
    registryValid: getExecutiveAssistantRuntimeRegistry().length === 1,
    runtimeAuthorized: metadata.runtime_authorized,
    runtimeEnabled: metadata.runtime_enabled,
    runtimeActive: metadata.runtime_active,
    assistantRuntimeEnabled: metadata.assistant_runtime_enabled,
    assistantRuntimeActive: metadata.assistant_runtime_active,
    cognitiveExecutionAllowed: metadata.cognitive_execution_allowed
  });
}

/**
 * @returns {boolean}
 */
export function isExecutiveAssistantRuntimeReady() {
  return getExecutiveAssistantRuntimeMetadata().assistant_ready === true;
}

/**
 * @returns {{
 *   assistantContract: object,
 *   conversationContract: object,
 *   lifecycleContract: object,
 *   policy: object
 * }}
 */
export function getExecutiveAssistantRuntimeBundle() {
  return {
    assistantContract: getRuntimeAssistantContract(),
    conversationContract: getRuntimeAssistantConversationContract(),
    lifecycleContract: getRuntimeAssistantLifecycleContract(),
    policy: getRuntimeAssistantPolicy()
  };
}

export default getExecutiveAssistantRuntimeMetadata;
