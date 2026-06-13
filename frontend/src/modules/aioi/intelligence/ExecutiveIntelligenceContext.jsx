/**
 * AIOI-P7.0 — Executive Intelligence Context (FOUNDATION ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveIntelligenceContext = createContext(null);

/**
 * @returns {{
 *   metadata: object,
 *   version: string,
 *   ready: boolean
 * } | null}
 */
export function useExecutiveIntelligence() {
  return useContext(ExecutiveIntelligenceContext);
}

export default ExecutiveIntelligenceContext;
