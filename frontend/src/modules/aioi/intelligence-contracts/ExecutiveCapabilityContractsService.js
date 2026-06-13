/**
 * AIOI-P7.3 — Executive Capability Contracts Service (CONTRACTS ONLY · READ ONLY)
 *
 * Contratos institucionais formais — sem IA, sem runtime, sem persistência.
 */

export const EXECUTIVE_CAPABILITY_CONTRACTS_VERSION = 'P7.3';

const INSIGHTS_CONTRACT = Object.freeze({
  id: 'executive_insights',
  available: true,
  enabled: false,
  version: EXECUTIVE_CAPABILITY_CONTRACTS_VERSION
});

const RECOMMENDATIONS_CONTRACT = Object.freeze({
  id: 'executive_recommendations',
  available: true,
  enabled: false,
  version: EXECUTIVE_CAPABILITY_CONTRACTS_VERSION
});

const ASSISTANT_CONTRACT = Object.freeze({
  id: 'executive_assistant',
  available: true,
  enabled: false,
  version: EXECUTIVE_CAPABILITY_CONTRACTS_VERSION
});

/**
 * @returns {{
 *   contracts_ready: boolean,
 *   insights_contract_available: boolean,
 *   recommendations_contract_available: boolean,
 *   assistant_contract_available: boolean,
 *   insights_enabled: boolean,
 *   recommendations_enabled: boolean,
 *   assistant_enabled: boolean,
 *   contracts_version: string
 * }}
 */
export function getExecutiveCapabilityContractsMetadata() {
  return {
    contracts_ready: true,
    insights_contract_available: true,
    recommendations_contract_available: true,
    assistant_contract_available: true,
    insights_enabled: false,
    recommendations_enabled: false,
    assistant_enabled: false,
    contracts_version: EXECUTIVE_CAPABILITY_CONTRACTS_VERSION
  };
}

/**
 * @returns {{ id: string, available: boolean, enabled: boolean, version: string }}
 */
export function getExecutiveInsightsContract() {
  return INSIGHTS_CONTRACT;
}

/**
 * @returns {{ id: string, available: boolean, enabled: boolean, version: string }}
 */
export function getExecutiveRecommendationsContract() {
  return RECOMMENDATIONS_CONTRACT;
}

/**
 * @returns {{ id: string, available: boolean, enabled: boolean, version: string }}
 */
export function getExecutiveAssistantContract() {
  return ASSISTANT_CONTRACT;
}

/**
 * @returns {boolean}
 */
export function areExecutiveCapabilityContractsReady() {
  return getExecutiveCapabilityContractsMetadata().contracts_ready === true;
}

export default getExecutiveCapabilityContractsMetadata;
