/**
 * AIOI-P8.4 — Executive Insights Runtime Context (FOUNDATION ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveInsightsRuntimeContext = createContext(null);

/**
 * @returns {{
 *   insightsReady: boolean,
 *   insightsRuntimeAvailable: boolean,
 *   insightsRuntimeEnabled: boolean,
 *   insightsRuntimeActive: boolean,
 *   runtimeAuthorized: boolean,
 *   runtimeEnabled: boolean,
 *   runtimeActive: boolean,
 *   cognitiveExecutionAllowed: boolean,
 *   metadata: object,
 *   contracts: object,
 *   registry: ReadonlyArray<object>,
 *   policies: object,
 *   validation: object
 * } | null}
 */
export function useExecutiveInsightsRuntime() {
  return useContext(ExecutiveInsightsRuntimeContext);
}

export default ExecutiveInsightsRuntimeContext;
