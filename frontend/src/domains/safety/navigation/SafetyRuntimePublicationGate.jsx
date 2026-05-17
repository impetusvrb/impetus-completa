import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useVisibleModules } from '../../../hooks/useVisibleModules.js';
import { assertSafetyPublicationAccess } from './safetyRuntimePublicationGuard.js';
import { fetchSafetyPublicationContext } from './safetyDomainPublicationRuntime.js';
import { safetyNavDebug } from '../../../utils/safetyNavDebug.js';

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('impetus_user') || '{}');
  } catch {
    return {};
  }
}

export function SafetyRuntimePublicationGate({ children }) {
  const location = useLocation();
  const { visibleModules, loading } = useVisibleModules();
  const [serverCtx, setServerCtx] = useState(null);

  useEffect(() => {
    let on = true;
    (async () => {
      const ctx = await fetchSafetyPublicationContext();
      if (on) setServerCtx(ctx);
    })();
    return () => {
      on = false;
    };
  }, [location.pathname, visibleModules.length]);

  if (loading) {
    return (
      <div
        className="impetus-card"
        style={{
          padding: '1.25rem',
          margin: '0.5rem',
          borderRadius: 4,
          color: 'var(--text-secondary)',
          fontFamily: 'var(--font-mono), monospace',
          fontSize: 13,
          letterSpacing: '0.08em',
          textTransform: 'uppercase'
        }}
      >
        Validando publicação SST…
      </div>
    );
  }

  const user = readUser();
  const gate = assertSafetyPublicationAccess({
    user,
    visibleModules,
    pathname: location.pathname,
    search: location.search || '',
    serverPublication: serverCtx
  });

  if (!gate.ok) {
    safetyNavDebug('[SAFETY_PUBLICATION_RUNTIME] gate_denied', {
      reason: gate.reason,
      pathname: location.pathname
    });
    return <Navigate to="/app" replace state={{ safety_publication_denied: gate.reason }} />;
  }

  return children;
}
