/**
 * AIOI-P7.5 — Executive Recommendations Foundation Service (FOUNDATION ONLY · READ ONLY)
 *
 * Infraestrutura institucional de Recommendations — sem geração, sem runtime, sem persistência.
 */

export const EXECUTIVE_RECOMMENDATIONS_FOUNDATION_VERSION = 'P7.5';

/**
 * @returns {{
 *   recommendations_foundation_ready: boolean,
 *   recommendations_contract_linked: boolean,
 *   recommendations_available: boolean,
 *   recommendations_enabled: boolean,
 *   recommendations_runtime_active: boolean,
 *   recommendations_version: string
 * }}
 */
export function getExecutiveRecommendationsFoundationMetadata() {
  return {
    recommendations_foundation_ready: true,
    recommendations_contract_linked: true,
    recommendations_available: true,
    recommendations_enabled: false,
    recommendations_runtime_active: false,
    recommendations_version: EXECUTIVE_RECOMMENDATIONS_FOUNDATION_VERSION
  };
}

/**
 * @returns {boolean}
 */
export function isExecutiveRecommendationsFoundationReady() {
  return getExecutiveRecommendationsFoundationMetadata().recommendations_foundation_ready === true;
}

/**
 * @param {{ id?: string, available?: boolean, enabled?: boolean, version?: string } | null | undefined} contract
 * @returns {boolean}
 */
export function isExecutiveRecommendationsContractLinked(contract) {
  return contract?.id === 'executive_recommendations' && contract?.available === true;
}

export default getExecutiveRecommendationsFoundationMetadata;
