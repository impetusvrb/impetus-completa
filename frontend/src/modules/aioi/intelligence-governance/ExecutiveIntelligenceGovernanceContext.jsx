/**
 * AIOI-P7.1 — Executive Intelligence Governance Context (GOVERNANCE ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveIntelligenceGovernanceContext = createContext(null);

/**
 * @returns {{
 *   metadata: object,
 *   governed: boolean,
 *   ready: boolean
 * } | null}
 */
export function useExecutiveIntelligenceGovernance() {
  return useContext(ExecutiveIntelligenceGovernanceContext);
}

export default ExecutiveIntelligenceGovernanceContext;
