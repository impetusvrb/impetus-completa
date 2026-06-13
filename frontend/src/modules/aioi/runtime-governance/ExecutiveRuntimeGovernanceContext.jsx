/**
 * AIOI-P8.1 — Executive Runtime Governance Context (GOVERNANCE FOUNDATION ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveRuntimeGovernanceContext = createContext(null);

/**
 * @returns {{
 *   governanceReady: boolean,
 *   governanceVersion: string,
 *   runtimeAuthorized: boolean,
 *   runtimeAuditable: boolean,
 *   runtimeEnabled: boolean,
 *   runtimeActive: boolean,
 *   complianceStatus: string,
 *   metadata: object,
 *   validation: object,
 *   contracts: object,
 *   registry: ReadonlyArray<object>
 * } | null}
 */
export function useExecutiveRuntimeGovernance() {
  return useContext(ExecutiveRuntimeGovernanceContext);
}

export default ExecutiveRuntimeGovernanceContext;
