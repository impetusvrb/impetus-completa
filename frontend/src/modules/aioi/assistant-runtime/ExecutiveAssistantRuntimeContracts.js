/**
 * AIOI-P8.6 — Executive Assistant Runtime Contracts (CONTRACTS ONLY · READ ONLY)
 */

export const EXECUTIVE_ASSISTANT_RUNTIME_CONTRACTS_VERSION = 'P8.6';

const RUNTIME_ASSISTANT_CONTRACT = Object.freeze({
  id: 'executive_runtime_assistant',
  available: true,
  enabled: false,
  version: EXECUTIVE_ASSISTANT_RUNTIME_CONTRACTS_VERSION
});

const RUNTIME_ASSISTANT_CONVERSATION_CONTRACT = Object.freeze({
  id: 'executive_runtime_assistant_conversation',
  available: true,
  enabled: false,
  version: EXECUTIVE_ASSISTANT_RUNTIME_CONTRACTS_VERSION
});

const RUNTIME_ASSISTANT_LIFECYCLE_CONTRACT = Object.freeze({
  id: 'executive_runtime_assistant_lifecycle',
  available: true,
  enabled: false,
  version: EXECUTIVE_ASSISTANT_RUNTIME_CONTRACTS_VERSION
});

/**
 * @returns {{ id: string, available: boolean, enabled: boolean, version: string }}
 */
export function getRuntimeAssistantContract() {
  return RUNTIME_ASSISTANT_CONTRACT;
}

/**
 * @returns {{ id: string, available: boolean, enabled: boolean, version: string }}
 */
export function getRuntimeAssistantConversationContract() {
  return RUNTIME_ASSISTANT_CONVERSATION_CONTRACT;
}

/**
 * @returns {{ id: string, available: boolean, enabled: boolean, version: string }}
 */
export function getRuntimeAssistantLifecycleContract() {
  return RUNTIME_ASSISTANT_LIFECYCLE_CONTRACT;
}

export const runtimeAssistantContract = RUNTIME_ASSISTANT_CONTRACT;
export const runtimeAssistantConversationContract = RUNTIME_ASSISTANT_CONVERSATION_CONTRACT;
export const runtimeAssistantLifecycleContract = RUNTIME_ASSISTANT_LIFECYCLE_CONTRACT;

export default {
  getRuntimeAssistantContract,
  getRuntimeAssistantConversationContract,
  getRuntimeAssistantLifecycleContract
};
