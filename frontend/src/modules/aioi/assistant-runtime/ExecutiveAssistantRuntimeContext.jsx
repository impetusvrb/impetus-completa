/**
 * AIOI-P8.6 — Executive Assistant Runtime Context (FOUNDATION ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveAssistantRuntimeContext = createContext(null);

/**
 * @returns {{
 *   assistantReady: boolean,
 *   assistantRuntimeAvailable: boolean,
 *   assistantRuntimeEnabled: boolean,
 *   assistantRuntimeActive: boolean,
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
export function useExecutiveAssistantRuntime() {
  return useContext(ExecutiveAssistantRuntimeContext);
}

export default ExecutiveAssistantRuntimeContext;
