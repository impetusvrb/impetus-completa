/**
 * AIOI-P6.4 — Executive Workspace Context (UI EXPERIENCE ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveWorkspaceContext = createContext(null);

/**
 * @returns {object|null}
 */
export function useExecutiveWorkspace() {
  return useContext(ExecutiveWorkspaceContext);
}

export default ExecutiveWorkspaceContext;
