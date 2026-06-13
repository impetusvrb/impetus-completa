/**
 * AIOI-P8.0 — Executive Cognitive Runtime Context (RUNTIME FOUNDATION ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveCognitiveRuntimeContext = createContext(null);

/**
 * @returns {{
 *   metadata: object,
 *   ready: boolean,
 *   supported: boolean,
 *   active: boolean
 * } | null}
 */
export function useExecutiveCognitiveRuntime() {
  return useContext(ExecutiveCognitiveRuntimeContext);
}

export default ExecutiveCognitiveRuntimeContext;
