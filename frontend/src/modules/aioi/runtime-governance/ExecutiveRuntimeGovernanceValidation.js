/**
 * AIOI-P8.1 — Executive Runtime Governance Validation Layer (READ ONLY)
 *
 * Valida requisitos mínimos — sem execução cognitiva.
 */

/**
 * @param {{
 *   runtimeFoundationReady?: boolean,
 *   capabilityContractsReady?: boolean,
 *   runtimeEnabled?: boolean,
 *   runtimeActive?: boolean,
 *   runtimeAuthorized?: boolean
 * }} input
 * @returns {{
 *   valid: boolean,
 *   p8FoundationPresent: boolean,
 *   capabilityContractsPresent: boolean,
 *   runtimeFoundationPresent: boolean,
 *   runtimeNotActive: boolean,
 *   runtimeNotAuthorized: boolean,
 *   runtimeNotEnabled: boolean
 * }}
 */
export function validateExecutiveRuntimeGovernanceRequirements(input = {}) {
  const runtimeFoundationReady = input.runtimeFoundationReady === true;
  const capabilityContractsReady = input.capabilityContractsReady === true;
  const runtimeEnabled = input.runtimeEnabled === true;
  const runtimeActive = input.runtimeActive === true;
  const runtimeAuthorized = input.runtimeAuthorized === true;

  const p8FoundationPresent = runtimeFoundationReady;
  const capabilityContractsPresent = capabilityContractsReady;
  const runtimeFoundationPresent = runtimeFoundationReady;
  const runtimeNotActive = runtimeActive !== true;
  const runtimeNotAuthorized = runtimeAuthorized !== true;
  const runtimeNotEnabled = runtimeEnabled !== true;

  const valid =
    p8FoundationPresent &&
    capabilityContractsPresent &&
    runtimeFoundationPresent &&
    runtimeNotActive &&
    runtimeNotAuthorized &&
    runtimeNotEnabled;

  return {
    valid,
    p8FoundationPresent,
    capabilityContractsPresent,
    runtimeFoundationPresent,
    runtimeNotActive,
    runtimeNotAuthorized,
    runtimeNotEnabled
  };
}

export default validateExecutiveRuntimeGovernanceRequirements;
