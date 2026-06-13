/**
 * AIOI-P8.2 — Executive Runtime Authorization Validation Layer (READ ONLY)
 */

/**
 * @param {{
 *   runtimeFoundationReady?: boolean,
 *   governanceFoundationReady?: boolean,
 *   hasContracts?: boolean,
 *   hasPolicies?: boolean,
 *   registryValid?: boolean,
 *   runtimeAuthorized?: boolean,
 *   runtimeEnabled?: boolean,
 *   runtimeActive?: boolean,
 *   cognitiveExecutionAllowed?: boolean
 * }} input
 * @returns {{
 *   valid: boolean,
 *   p8FoundationPresent: boolean,
 *   p81GovernancePresent: boolean,
 *   contractsPresent: boolean,
 *   policiesPresent: boolean,
 *   registryValid: boolean,
 *   noCognitiveExecution: boolean,
 *   runtimeNotAuthorized: boolean,
 *   runtimeNotEnabled: boolean,
 *   runtimeNotActive: boolean
 * }}
 */
export function validateRuntimeAuthorizationFoundation(input = {}) {
  const runtimeFoundationReady = input.runtimeFoundationReady === true;
  const governanceFoundationReady = input.governanceFoundationReady === true;
  const hasContracts = input.hasContracts === true;
  const hasPolicies = input.hasPolicies === true;
  const registryValid = input.registryValid === true;
  const runtimeAuthorized = input.runtimeAuthorized === true;
  const runtimeEnabled = input.runtimeEnabled === true;
  const runtimeActive = input.runtimeActive === true;
  const cognitiveExecutionAllowed = input.cognitiveExecutionAllowed === true;

  const p8FoundationPresent = runtimeFoundationReady;
  const p81GovernancePresent = governanceFoundationReady;
  const contractsPresent = hasContracts;
  const policiesPresent = hasPolicies;
  const noCognitiveExecution = cognitiveExecutionAllowed !== true;
  const runtimeNotAuthorized = runtimeAuthorized !== true;
  const runtimeNotEnabled = runtimeEnabled !== true;
  const runtimeNotActive = runtimeActive !== true;

  const valid =
    p8FoundationPresent &&
    p81GovernancePresent &&
    contractsPresent &&
    policiesPresent &&
    registryValid &&
    noCognitiveExecution &&
    runtimeNotAuthorized &&
    runtimeNotEnabled &&
    runtimeNotActive;

  return {
    valid,
    p8FoundationPresent,
    p81GovernancePresent,
    contractsPresent,
    policiesPresent,
    registryValid,
    noCognitiveExecution,
    runtimeNotAuthorized,
    runtimeNotEnabled,
    runtimeNotActive
  };
}

export default validateRuntimeAuthorizationFoundation;
