/**
 * AIOI-P8.4 — Executive Insights Runtime Policies (READ ONLY)
 */

export const runtimeInsightsPolicy = Object.freeze({
  allowInsightsExecution: false,
  allowInsightsGeneration: false,
  allowInsightsActivation: false,
  allowInsightsInference: false,
  allowRuntimeActivation: false
});

/**
 * @returns {{
 *   allowInsightsExecution: boolean,
 *   allowInsightsGeneration: boolean,
 *   allowInsightsActivation: boolean,
 *   allowInsightsInference: boolean,
 *   allowRuntimeActivation: boolean
 * }}
 */
export function getRuntimeInsightsPolicy() {
  return runtimeInsightsPolicy;
}

export default getRuntimeInsightsPolicy;
