/**
 * AIOI-P8.2 — Executive Runtime Authorization Context (AUTHORIZATION FOUNDATION ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveRuntimeAuthorizationContext = createContext(null);

/**
 * @returns {{
 *   authorizationReady: boolean,
 *   authorizationVersion: string,
 *   runtimeAuthorized: boolean,
 *   runtimeEnabled: boolean,
 *   runtimeActive: boolean,
 *   authorizationMode: string,
 *   authorizationStatus: string,
 *   metadata: object,
 *   policies: object,
 *   contracts: object,
 *   registry: ReadonlyArray<object>,
 *   validation: object
 * } | null}
 */
export function useExecutiveRuntimeAuthorization() {
  return useContext(ExecutiveRuntimeAuthorizationContext);
}

export default ExecutiveRuntimeAuthorizationContext;
