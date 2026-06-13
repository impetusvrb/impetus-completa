/**
 * AIOI-P6.8 — Executive Shortcuts Context (UI EXPERIENCE ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveShortcutsContext = createContext(null);

/**
 * @returns {{
 *   metadata: object,
 *   shortcutsReady: boolean,
 *   addShortcut: (moduleId: string) => void,
 *   removeShortcut: (moduleId: string) => void,
 *   isShortcut: (moduleId: string) => boolean,
 *   listShortcuts: () => string[],
 *   resetShortcuts: () => void
 * } | null}
 */
export function useExecutiveShortcuts() {
  return useContext(ExecutiveShortcutsContext);
}

export default ExecutiveShortcutsContext;
