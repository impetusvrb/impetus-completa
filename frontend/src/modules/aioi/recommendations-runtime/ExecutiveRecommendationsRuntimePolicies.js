/**
 * AIOI-P8.5 — Executive Recommendations Runtime Policies (READ ONLY)
 */

export const runtimeRecommendationsPolicy = Object.freeze({
  allowRecommendationsExecution: false,
  allowRecommendationsGeneration: false,
  allowRecommendationsActivation: false,
  allowRecommendationsInference: false,
  allowRuntimeActivation: false
});

/**
 * @returns {{
 *   allowRecommendationsExecution: boolean,
 *   allowRecommendationsGeneration: boolean,
 *   allowRecommendationsActivation: boolean,
 *   allowRecommendationsInference: boolean,
 *   allowRuntimeActivation: boolean
 * }}
 */
export function getRuntimeRecommendationsPolicy() {
  return runtimeRecommendationsPolicy;
}

export default getRuntimeRecommendationsPolicy;
