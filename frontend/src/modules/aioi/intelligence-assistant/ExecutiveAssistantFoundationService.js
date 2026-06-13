/**
 * AIOI-P7.6 — Executive Assistant Foundation Service (FOUNDATION ONLY · READ ONLY)
 *
 * Infraestrutura institucional de Assistant — sem chat, sem runtime, sem persistência.
 */

export const EXECUTIVE_ASSISTANT_FOUNDATION_VERSION = 'P7.6';

/**
 * @returns {{
 *   assistant_foundation_ready: boolean,
 *   assistant_contract_linked: boolean,
 *   assistant_available: boolean,
 *   assistant_enabled: boolean,
 *   assistant_runtime_active: boolean,
 *   assistant_version: string
 * }}
 */
export function getExecutiveAssistantFoundationMetadata() {
  return {
    assistant_foundation_ready: true,
    assistant_contract_linked: true,
    assistant_available: true,
    assistant_enabled: false,
    assistant_runtime_active: false,
    assistant_version: EXECUTIVE_ASSISTANT_FOUNDATION_VERSION
  };
}

/**
 * @returns {boolean}
 */
export function isExecutiveAssistantFoundationReady() {
  return getExecutiveAssistantFoundationMetadata().assistant_foundation_ready === true;
}

/**
 * @param {{ id?: string, available?: boolean, enabled?: boolean, version?: string } | null | undefined} contract
 * @returns {boolean}
 */
export function isExecutiveAssistantContractLinked(contract) {
  return contract?.id === 'executive_assistant' && contract?.available === true;
}

export default getExecutiveAssistantFoundationMetadata;
