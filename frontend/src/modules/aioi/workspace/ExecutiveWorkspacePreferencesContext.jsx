/**
 * AIOI-P6.5 — Executive Workspace Preferences Context (UI EXPERIENCE ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveWorkspacePreferencesContext = createContext(null);

/**
 * @returns {{
 *   preferences: import('./ExecutiveWorkspacePreferencesService.js').ReturnType<import('./ExecutiveWorkspacePreferencesService.js').getDefaultExecutiveWorkspacePreferences>,
 *   preferencesReady: boolean,
 *   updatePreferences: (partial: object) => void,
 *   resetPreferences: () => void
 * } | null}
 */
export function useExecutiveWorkspacePreferences() {
  return useContext(ExecutiveWorkspacePreferencesContext);
}

export default ExecutiveWorkspacePreferencesContext;
