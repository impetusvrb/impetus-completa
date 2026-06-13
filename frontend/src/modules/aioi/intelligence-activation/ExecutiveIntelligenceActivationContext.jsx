/**
 * AIOI-P7.2 — Executive Intelligence Activation Context (ACTIVATION FRAMEWORK ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveIntelligenceActivationContext = createContext(null);

/**
 * @returns {{
 *   metadata: object,
 *   ready: boolean,
 *   supported: boolean
 * } | null}
 */
export function useExecutiveIntelligenceActivation() {
  return useContext(ExecutiveIntelligenceActivationContext);
}

export default ExecutiveIntelligenceActivationContext;
