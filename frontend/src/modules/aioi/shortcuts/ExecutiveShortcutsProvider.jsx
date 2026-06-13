/**
 * AIOI-P6.8 — Executive Shortcuts Provider (UI EXPERIENCE ONLY)
 *
 * Atalhos executivos certificados — sem navegação automática, sem permissões.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ExecutiveShortcutsContext } from './ExecutiveShortcutsContext.jsx';
import ExecutiveWorkspaceShortcuts from './ExecutiveWorkspaceShortcuts.jsx';
import {
  addShortcut as addShortcutToList,
  buildShortcutsMetadata,
  isShortcut as checkIsShortcut,
  listShortcuts as listShortcutsFromModel,
  loadExecutiveShortcuts,
  removeShortcut as removeShortcutFromList,
  resetExecutiveShortcuts,
  resolveShortcutsStorage,
  saveExecutiveShortcuts
} from './ExecutiveShortcutsService.js';
import styles from './ExecutiveShortcuts.module.css';

/**
 * @param {{
 *   children?: React.ReactNode,
 *   storageAdapter?: { getItem: (k: string) => string|null, setItem: (k: string, v: string) => void, removeItem: (k: string) => void }
 * }} props
 */
export function ExecutiveShortcutsProvider({ children, storageAdapter }) {
  const storage = useMemo(() => resolveShortcutsStorage(storageAdapter), [storageAdapter]);
  const [model, setModel] = useState(() => loadExecutiveShortcuts(storage));
  const [shortcutsReady, setShortcutsReady] = useState(false);

  useEffect(() => {
    setModel(loadExecutiveShortcuts(storage));
    setShortcutsReady(true);
  }, [storage]);

  const metadata = useMemo(() => buildShortcutsMetadata(model.shortcuts), [model.shortcuts]);

  const addShortcut = useCallback(
    (moduleId) => {
      setModel((prev) => {
        const nextShortcuts = addShortcutToList(prev.shortcuts, moduleId);
        return saveExecutiveShortcuts({ ...prev, shortcuts: nextShortcuts }, storage);
      });
    },
    [storage]
  );

  const removeShortcut = useCallback(
    (moduleId) => {
      setModel((prev) => {
        const nextShortcuts = removeShortcutFromList(prev.shortcuts, moduleId);
        return saveExecutiveShortcuts({ ...prev, shortcuts: nextShortcuts }, storage);
      });
    },
    [storage]
  );

  const isShortcut = useCallback(
    (moduleId) => checkIsShortcut(model.shortcuts, moduleId),
    [model.shortcuts]
  );

  const listShortcuts = useCallback(
    () => listShortcutsFromModel(model.shortcuts),
    [model.shortcuts]
  );

  const resetShortcuts = useCallback(() => {
    const defaults = resetExecutiveShortcuts(storage);
    setModel(defaults);
  }, [storage]);

  const contextValue = useMemo(
    () => ({
      metadata,
      shortcutsReady,
      addShortcut,
      removeShortcut,
      isShortcut,
      listShortcuts,
      resetShortcuts,
      readOnly: true
    }),
    [metadata, shortcutsReady, addShortcut, removeShortcut, isShortcut, listShortcuts, resetShortcuts]
  );

  return (
    <ExecutiveShortcutsContext.Provider value={contextValue}>
      <div
        className={styles.providerShell}
        data-testid="executive-shortcuts-provider"
        data-shortcuts-ready={shortcutsReady ? 'true' : 'false'}
        aria-label="Executive Shortcuts Provider"
      >
        <ExecutiveWorkspaceShortcuts metadata={metadata} />
        <div className={styles.providerContent}>{children}</div>
      </div>
    </ExecutiveShortcutsContext.Provider>
  );
}

export default ExecutiveShortcutsProvider;
