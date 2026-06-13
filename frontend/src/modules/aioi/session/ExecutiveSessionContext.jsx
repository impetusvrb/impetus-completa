/**
 * AIOI-P6.6 — Executive Session Context (UI EXPERIENCE ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveSessionContext = createContext(null);

/**
 * @returns {{
 *   session: object,
 *   sessionReady: boolean,
 *   metadata: object,
 *   recoveryInfo: object,
 *   updateSession: (partial: object) => void,
 *   resetSession: () => void,
 *   recordModuleVisit: (moduleId: string) => void
 * } | null}
 */
export function useExecutiveSession() {
  return useContext(ExecutiveSessionContext);
}

export default ExecutiveSessionContext;
