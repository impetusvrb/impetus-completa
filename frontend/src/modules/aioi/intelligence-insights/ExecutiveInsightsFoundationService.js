/**
 * AIOI-P7.4 — Executive Insights Foundation Service (FOUNDATION ONLY · READ ONLY)
 *
 * Infraestrutura institucional de Insights — sem geração, sem runtime, sem persistência.
 */

export const EXECUTIVE_INSIGHTS_FOUNDATION_VERSION = 'P7.4';

/**
 * @returns {{
 *   insights_foundation_ready: boolean,
 *   insights_contract_linked: boolean,
 *   insights_available: boolean,
 *   insights_enabled: boolean,
 *   insights_runtime_active: boolean,
 *   insights_version: string
 * }}
 */
export function getExecutiveInsightsFoundationMetadata() {
  return {
    insights_foundation_ready: true,
    insights_contract_linked: true,
    insights_available: true,
    insights_enabled: false,
    insights_runtime_active: false,
    insights_version: EXECUTIVE_INSIGHTS_FOUNDATION_VERSION
  };
}

/**
 * @returns {boolean}
 */
export function isExecutiveInsightsFoundationReady() {
  return getExecutiveInsightsFoundationMetadata().insights_foundation_ready === true;
}

/**
 * @param {{ id?: string, available?: boolean, enabled?: boolean, version?: string } | null | undefined} contract
 * @returns {boolean}
 */
export function isExecutiveInsightsContractLinked(contract) {
  return contract?.id === 'executive_insights' && contract?.available === true;
}

export default getExecutiveInsightsFoundationMetadata;
