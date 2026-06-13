/**
 * AIOI-P6.2 — Executive Navigation Context (UI EXPERIENCE ONLY)
 */

import { createContext, useContext } from 'react';

export const ExecutiveNavigationContext = createContext(null);

/**
 * @returns {object|null}
 */
export function useExecutiveNavigation() {
  return useContext(ExecutiveNavigationContext);
}

export default ExecutiveNavigationContext;
