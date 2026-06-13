/**
 * AIOI-P7.5 — Executive Recommendations Foundation Context (FOUNDATION ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveRecommendationsFoundationContext = createContext(null);

/**
 * @returns {{
 *   metadata: object,
 *   ready: boolean,
 *   available: boolean,
 *   contractLinked: boolean
 * } | null}
 */
export function useExecutiveRecommendationsFoundation() {
  return useContext(ExecutiveRecommendationsFoundationContext);
}

export default ExecutiveRecommendationsFoundationContext;
