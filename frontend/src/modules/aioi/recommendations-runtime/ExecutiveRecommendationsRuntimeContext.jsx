/**
 * AIOI-P8.5 — Executive Recommendations Runtime Context (FOUNDATION ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveRecommendationsRuntimeContext = createContext(null);

/**
 * @returns {{
 *   recommendationsReady: boolean,
 *   recommendationsRuntimeAvailable: boolean,
 *   recommendationsRuntimeEnabled: boolean,
 *   recommendationsRuntimeActive: boolean,
 *   runtimeAuthorized: boolean,
 *   runtimeEnabled: boolean,
 *   runtimeActive: boolean,
 *   cognitiveExecutionAllowed: boolean,
 *   metadata: object,
 *   contracts: object,
 *   policies: object,
 *   registry: ReadonlyArray<object>,
 *   validation: object
 * } | null}
 */
export function useExecutiveRecommendationsRuntime() {
  return useContext(ExecutiveRecommendationsRuntimeContext);
}

export default ExecutiveRecommendationsRuntimeContext;
