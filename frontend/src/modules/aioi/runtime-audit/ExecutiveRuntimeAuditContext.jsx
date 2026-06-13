/**
 * AIOI-P8.3 — Executive Runtime Audit Context (AUDIT FOUNDATION ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveRuntimeAuditContext = createContext(null);

/**
 * @returns {{
 *   auditReady: boolean,
 *   auditVersion: string,
 *   runtimeAuditable: boolean,
 *   runtimeAuthorized: boolean,
 *   runtimeEnabled: boolean,
 *   runtimeActive: boolean,
 *   auditMode: string,
 *   auditStatus: string,
 *   metadata: object,
 *   policies: object,
 *   contracts: object,
 *   registry: ReadonlyArray<object>,
 *   validation: object
 * } | null}
 */
export function useExecutiveRuntimeAudit() {
  return useContext(ExecutiveRuntimeAuditContext);
}

export default ExecutiveRuntimeAuditContext;
