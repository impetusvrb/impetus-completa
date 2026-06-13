/**
 * AIOI-P7.3 — Executive Capability Contracts Context (CONTRACTS ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveCapabilityContractsContext = createContext(null);

/**
 * @returns {{
 *   metadata: object,
 *   insightsContract: object,
 *   recommendationsContract: object,
 *   assistantContract: object,
 *   ready: boolean
 * } | null}
 */
export function useExecutiveCapabilityContracts() {
  return useContext(ExecutiveCapabilityContractsContext);
}

export default ExecutiveCapabilityContractsContext;
