/**
 * AIOI-P8.4 — Executive Insights Runtime Service (FOUNDATION ONLY · READ ONLY)
 *
 * Fundação institucional de insights runtime — sem execução, sem inferência.
 */

import { getRuntimeInsightsPolicy } from './ExecutiveInsightsRuntimePolicies.js';
import {
  getRuntimeInsightsContract,
  getRuntimeInsightsConsumptionContract,
  getRuntimeInsightsLifecycleContract
} from './ExecutiveInsightsRuntimeContracts.js';
import { getExecutiveInsightsRuntimeRegistry } from './ExecutiveInsightsRuntimeRegistry.js';
import { validateInsightsRuntimeFoundation } from './ExecutiveInsightsRuntimeValidation.js';

export const EXECUTIVE_INSIGHTS_RUNTIME_VERSION = 'P8.4';

/**
 * @returns {{
 *   insights_ready: boolean,
 *   insights_runtime_available: boolean,
 *   insights_runtime_enabled: boolean,
 *   insights_runtime_active: boolean,
 *   runtime_authorized: boolean,
 *   runtime_enabled: boolean,
 *   runtime_active: boolean,
 *   cognitive_execution_allowed: boolean,
 *   insights_mode: string,
 *   insights_status: string,
 *   governance_dependency: boolean,
 *   authorization_dependency: boolean,
 *   audit_dependency: boolean,
 *   registry_count: number
 * }}
 */
export function getExecutiveInsightsRuntimeMetadata() {
  return {
    insights_ready: true,
    insights_runtime_available: true,
    insights_runtime_enabled: false,
    insights_runtime_active: false,
    runtime_authorized: false,
    runtime_enabled: false,
    runtime_active: false,
    cognitive_execution_allowed: false,
    insights_mode: 'FOUNDATION_ONLY',
    insights_status: 'READY',
    governance_dependency: true,
    authorization_dependency: true,
    audit_dependency: true,
    registry_count: getExecutiveInsightsRuntimeRegistry().length
  };
}

/**
 * @param {{
 *   runtimeFoundationReady?: boolean,
 *   governanceFoundationReady?: boolean,
 *   authorizationFoundationReady?: boolean,
 *   auditFoundationReady?: boolean
 * }} deps
 * @returns {ReturnType<typeof validateInsightsRuntimeFoundation>}
 */
export function validateExecutiveInsightsRuntimeState(deps = {}) {
  const metadata = getExecutiveInsightsRuntimeMetadata();
  return validateInsightsRuntimeFoundation({
    runtimeFoundationReady: deps.runtimeFoundationReady === true,
    governanceFoundationReady: deps.governanceFoundationReady === true,
    authorizationFoundationReady: deps.authorizationFoundationReady === true,
    auditFoundationReady: deps.auditFoundationReady === true,
    hasContracts: true,
    hasPolicies: true,
    registryValid: getExecutiveInsightsRuntimeRegistry().length === 2,
    runtimeAuthorized: metadata.runtime_authorized,
    runtimeEnabled: metadata.runtime_enabled,
    runtimeActive: metadata.runtime_active,
    insightsRuntimeEnabled: metadata.insights_runtime_enabled,
    insightsRuntimeActive: metadata.insights_runtime_active,
    cognitiveExecutionAllowed: metadata.cognitive_execution_allowed
  });
}

/**
 * @returns {boolean}
 */
export function isExecutiveInsightsRuntimeReady() {
  return getExecutiveInsightsRuntimeMetadata().insights_ready === true;
}

/**
 * @returns {{
 *   insightsContract: object,
 *   consumptionContract: object,
 *   lifecycleContract: object,
 *   policy: object
 * }}
 */
export function getExecutiveInsightsRuntimeBundle() {
  return {
    insightsContract: getRuntimeInsightsContract(),
    consumptionContract: getRuntimeInsightsConsumptionContract(),
    lifecycleContract: getRuntimeInsightsLifecycleContract(),
    policy: getRuntimeInsightsPolicy()
  };
}

export default getExecutiveInsightsRuntimeMetadata;
