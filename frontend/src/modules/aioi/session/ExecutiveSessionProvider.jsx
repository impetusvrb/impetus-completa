/**
 * AIOI-P6.6 — Executive Session Provider (UI EXPERIENCE ONLY)
 *
 * Continuidade operacional da sessão executiva — sem redirecionamento, sem navegação.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveExecutiveDeepLink } from '../deep-linking/ExecutiveDeepLinkResolver.js';
import { useExecutiveWorkspacePreferences } from '../workspace/ExecutiveWorkspacePreferencesContext.jsx';
import { ExecutiveSessionContext } from './ExecutiveSessionContext.jsx';
import {
  buildSessionMetadata,
  buildSessionRecoveryInfo,
  loadExecutiveSession,
  normalizeExecutiveSession,
  recordExecutiveModuleVisit,
  resetExecutiveSession,
  resolveSessionStorage,
  saveExecutiveSession
} from './ExecutiveSessionService.js';

/**
 * @param {{
 *   children?: React.ReactNode,
 *   storageAdapter?: { getItem: (k: string) => string|null, setItem: (k: string, v: string) => void, removeItem: (k: string) => void }
 * }} props
 */
export function ExecutiveSessionProvider({ children, storageAdapter }) {
  const storage = useMemo(() => resolveSessionStorage(storageAdapter), [storageAdapter]);
  const [session, setSession] = useState(() => loadExecutiveSession(storage));
  const [sessionReady, setSessionReady] = useState(false);
  const location = useLocation();
  const prefsCtx = useExecutiveWorkspacePreferences();

  useEffect(() => {
    setSession(loadExecutiveSession(storage));
    setSessionReady(true);
  }, [storage]);

  useEffect(() => {
    const resolved = resolveExecutiveDeepLink(location.pathname);
    if (!resolved.ok || !resolved.module) {
      return;
    }
    setSession((prev) => {
      const next = recordExecutiveModuleVisit(prev, resolved.module);
      if (next.last_module === prev.last_module && next.last_visit === prev.last_visit) {
        return prev;
      }
      return saveExecutiveSession(next, storage);
    });
  }, [location.pathname, storage]);

  const preferencesLoaded = prefsCtx?.preferencesReady === true;

  const metadata = useMemo(
    () => buildSessionMetadata(session, preferencesLoaded),
    [session, preferencesLoaded]
  );

  const recoveryInfo = useMemo(
    () => buildSessionRecoveryInfo(session, preferencesLoaded),
    [session, preferencesLoaded]
  );

  const updateSession = useCallback(
    (partial) => {
      setSession((prev) => saveExecutiveSession({ ...prev, ...partial }, storage));
    },
    [storage]
  );

  const resetSession = useCallback(() => {
    const defaults = resetExecutiveSession(storage);
    setSession(normalizeExecutiveSession(defaults));
  }, [storage]);

  const recordModuleVisit = useCallback(
    (moduleId) => {
      setSession((prev) => saveExecutiveSession(recordExecutiveModuleVisit(prev, moduleId), storage));
    },
    [storage]
  );

  const contextValue = useMemo(
    () => ({
      session,
      sessionReady,
      metadata,
      recoveryInfo,
      updateSession,
      resetSession,
      recordModuleVisit,
      readOnly: true
    }),
    [session, sessionReady, metadata, recoveryInfo, updateSession, resetSession, recordModuleVisit]
  );

  return (
    <ExecutiveSessionContext.Provider value={contextValue}>
      <div
        data-testid="executive-session-provider"
        data-session-ready={sessionReady ? 'true' : 'false'}
        data-session-active={metadata.session_active ? 'true' : 'false'}
        data-last-module={metadata.last_module || ''}
        aria-label="Executive Session Provider"
      >
        {children}
      </div>
    </ExecutiveSessionContext.Provider>
  );
}

export default ExecutiveSessionProvider;
