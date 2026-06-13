/**
 * AIOI-P6.5 — Executive Workspace Preferences Provider (UI EXPERIENCE ONLY)
 *
 * Preferências do utilizador — escopo Workspace. Persistência localStorage.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExecutiveWorkspacePreferencesContext } from './ExecutiveWorkspacePreferencesContext.jsx';
import {
  getDefaultExecutiveWorkspacePreferences,
  loadExecutiveWorkspacePreferences,
  normalizeExecutiveWorkspacePreferences,
  resetExecutiveWorkspacePreferences,
  resolvePreferencesStorage,
  saveExecutiveWorkspacePreferences
} from './ExecutiveWorkspacePreferencesService.js';
import prefStyles from './ExecutiveWorkspacePreferences.module.css';

/**
 * @param {{
 *   children?: React.ReactNode,
 *   storageAdapter?: { getItem: (k: string) => string|null, setItem: (k: string, v: string) => void, removeItem: (k: string) => void }
 * }} props
 */
export function ExecutiveWorkspacePreferencesProvider({ children, storageAdapter }) {
  const storage = useMemo(() => resolvePreferencesStorage(storageAdapter), [storageAdapter]);
  const [preferences, setPreferences] = useState(() => loadExecutiveWorkspacePreferences(storage));
  const [preferencesReady, setPreferencesReady] = useState(false);

  useEffect(() => {
    setPreferences(loadExecutiveWorkspacePreferences(storage));
    setPreferencesReady(true);
  }, [storage]);

  const updatePreferences = useCallback(
    (partial) => {
      setPreferences((prev) => {
        const merged = {
          ...prev,
          ...partial,
          indicatorVisibility: {
            ...prev.indicatorVisibility,
            ...(partial.indicatorVisibility || {})
          }
        };
        return saveExecutiveWorkspacePreferences(merged, storage);
      });
    },
    [storage]
  );

  const resetPreferences = useCallback(() => {
    const defaults = resetExecutiveWorkspacePreferences(storage);
    setPreferences(normalizeExecutiveWorkspacePreferences(defaults));
  }, [storage]);

  const contextValue = useMemo(
    () => ({
      preferences,
      preferencesReady,
      updatePreferences,
      resetPreferences
    }),
    [preferences, preferencesReady, updatePreferences, resetPreferences]
  );

  return (
    <ExecutiveWorkspacePreferencesContext.Provider value={contextValue}>
      <div
        className={prefStyles.preferencesShell}
        data-testid="executive-workspace-preferences-provider"
        data-preferences-ready={preferencesReady ? 'true' : 'false'}
        aria-label="Executive Workspace Preferences Provider"
      >
        {children}
      </div>
    </ExecutiveWorkspacePreferencesContext.Provider>
  );
}

export default ExecutiveWorkspacePreferencesProvider;
