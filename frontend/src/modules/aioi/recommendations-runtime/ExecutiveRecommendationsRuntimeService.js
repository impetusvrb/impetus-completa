/**
 * AIOI-P8.5 — Executive Recommendations Runtime Service (FOUNDATION ONLY · READ ONLY)
 *
 * Fundação institucional de recommendations runtime — sem execução, sem inferência.
 */

import { getRuntimeRecommendationsPolicy } from './ExecutiveRecommendationsRuntimePolicies.js';
import {
  getRuntimeRecommendationsContract,
  getRuntimeRecommendationsConsumptionContract,
  getRuntimeRecommendationsLifecycleContract
} from './ExecutiveRecommendationsRuntimeContracts.js';
import { getExecutiveRecommendationsRuntimeRegistry } from './ExecutiveRecommendationsRuntimeRegistry.js';
import { validateRecommendationsRuntimeFoundation } from './ExecutiveRecommendationsRuntimeValidation.js';

export const EXECUTIVE_RECOMMENDATIONS_RUNTIME_VERSION = 'P8.5';

/**
 * @returns {{
 *   recommendations_ready: boolean,
 *   recommendations_runtime_available: boolean,
 *   recommendations_runtime_enabled: boolean,
 *   recommendations_runtime_active: boolean,
 *   runtime_authorized: boolean,
 *   runtime_enabled: boolean,
 *   runtime_active: boolean,
 *   cognitive_execution_allowed: boolean,
 *   recommendations_mode: string,
 *   recommendations_status: string,
 *   governance_dependency: boolean,
 *   authorization_dependency: boolean,
 *   audit_dependency: boolean,
 *   insights_dependency: boolean,
 *   registry_count: number
 * }}
 */
export function getExecutiveRecommendationsRuntimeMetadata() {
  return {
    recommendations_ready: true,
    recommendations_runtime_available: true,
    recommendations_runtime_enabled: false,
    recommendations_runtime_active: false,
    runtime_authorized: false,
    runtime_enabled: false,
    runtime_active: false,
    cognitive_execution_allowed: false,
    recommendations_mode: 'FOUNDATION_ONLY',
    recommendations_status: 'READY',
    governance_dependency: true,
    authorization_dependency: true,
    audit_dependency: true,
    insights_dependency: true,
    registry_count: getExecutiveRecommendationsRuntimeRegistry().length
  };
}

/**
 * @param {{
 *   runtimeFoundationReady?: boolean,
 *   governanceFoundationReady?: boolean,
 *   authorizationFoundationReady?: boolean,
 *   auditFoundationReady?: boolean,
 *   insightsFoundationReady?: boolean
 * }} deps
 * @returns {ReturnType<typeof validateRecommendationsRuntimeFoundation>}
 */
export function validateExecutiveRecommendationsRuntimeState(deps = {}) {
  const metadata = getExecutiveRecommendationsRuntimeMetadata();
  return validateRecommendationsRuntimeFoundation({
    runtimeFoundationReady: deps.runtimeFoundationReady === true,
    governanceFoundationReady: deps.governanceFoundationReady === true,
    authorizationFoundationReady: deps.authorizationFoundationReady === true,
    auditFoundationReady: deps.auditFoundationReady === true,
    insightsFoundationReady: deps.insightsFoundationReady === true,
    hasContracts: true,
    hasPolicies: true,
    registryValid: getExecutiveRecommendationsRuntimeRegistry().length === 1,
    runtimeAuthorized: metadata.runtime_authorized,
    runtimeEnabled: metadata.runtime_enabled,
    runtimeActive: metadata.runtime_active,
    recommendationsRuntimeEnabled: metadata.recommendations_runtime_enabled,
    recommendationsRuntimeActive: metadata.recommendations_runtime_active,
    cognitiveExecutionAllowed: metadata.cognitive_execution_allowed
  });
}

/**
 * @returns {boolean}
 */
export function isExecutiveRecommendationsRuntimeReady() {
  return getExecutiveRecommendationsRuntimeMetadata().recommendations_ready === true;
}

/**
 * @returns {{
 *   recommendationsContract: object,
 *   consumptionContract: object,
 *   lifecycleContract: object,
 *   policy: object
 * }}
 */
export function getExecutiveRecommendationsRuntimeBundle() {
  return {
    recommendationsContract: getRuntimeRecommendationsContract(),
    consumptionContract: getRuntimeRecommendationsConsumptionContract(),
    lifecycleContract: getRuntimeRecommendationsLifecycleContract(),
    policy: getRuntimeRecommendationsPolicy()
  };
}

export default getExecutiveRecommendationsRuntimeMetadata;
