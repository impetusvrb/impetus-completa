/**
 * AIOI-P7.4 — Executive Insights Foundation Context (FOUNDATION ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveInsightsFoundationContext = createContext(null);

/**
 * @returns {{
 *   metadata: object,
 *   ready: boolean,
 *   available: boolean,
 *   contractLinked: boolean
 * } | null}
 */
export function useExecutiveInsightsFoundation() {
  return useContext(ExecutiveInsightsFoundationContext);
}

export default ExecutiveInsightsFoundationContext;
