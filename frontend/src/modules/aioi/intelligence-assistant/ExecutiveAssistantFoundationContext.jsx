/**
 * AIOI-P7.6 — Executive Assistant Foundation Context (FOUNDATION ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveAssistantFoundationContext = createContext(null);

/**
 * @returns {{
 *   metadata: object,
 *   ready: boolean,
 *   available: boolean,
 *   contractLinked: boolean
 * } | null}
 */
export function useExecutiveAssistantFoundation() {
  return useContext(ExecutiveAssistantFoundationContext);
}

export default ExecutiveAssistantFoundationContext;
