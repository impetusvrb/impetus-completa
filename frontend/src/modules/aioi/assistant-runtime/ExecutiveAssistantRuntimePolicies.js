/**
 * AIOI-P8.6 — Executive Assistant Runtime Policies (READ ONLY)
 */

export const runtimeAssistantPolicy = Object.freeze({
  allowAssistantExecution: false,
  allowAssistantGeneration: false,
  allowAssistantInference: false,
  allowAssistantActivation: false,
  allowRuntimeActivation: false
});

/**
 * @returns {{
 *   allowAssistantExecution: boolean,
 *   allowAssistantGeneration: boolean,
 *   allowAssistantInference: boolean,
 *   allowAssistantActivation: boolean,
 *   allowRuntimeActivation: boolean
 * }}
 */
export function getRuntimeAssistantPolicy() {
  return runtimeAssistantPolicy;
}

export default getRuntimeAssistantPolicy;
