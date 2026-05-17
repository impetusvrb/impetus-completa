import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useVisibleModules } from '../../../hooks/useVisibleModules.js';
import { assertQualityPublicationAccess } from './qualityRuntimePublicationGuard.js';
import { fetchQualityPublicationContext } from './qualityDomainPublicationRuntime.js';
import { qualityNavDebug } from '../../../utils/qualityNavDebug.js';

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('impetus_user') || '{}');
  } catch {
    return {};
  }
}

/**
 * Bloqueia montagem do runtime QUALITY quando URL forçada sem governo/capability.
 */
export function QualityRuntimePublicationGate({ children }) {
  const location = useLocation();
  const { visibleModules, loading } = useVisibleModules();
  const [serverCtx, setServerCtx] = useState(null);

  useEffect(() => {
    let on = true;
    (async () => {
      const ctx = await fetchQualityPublicationContext();
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
        Validando publicação QUALITY…
      </div>
    );
  }

  const user = readUser();
  const gate = assertQualityPublicationAccess({
    user,
    visibleModules,
    pathname: location.pathname,
    search: location.search || '',
    serverPublication: serverCtx
  });

  if (!gate.ok) {
    qualityNavDebug('[QUALITY_PUBLICATION_RUNTIME] gate_denied', {
      reason: gate.reason,
      pathname: location.pathname,
      search: location.search || ''
    });
    return (
      <Navigate
        to="/app"
        replace
        state={{ quality_publication_denied: gate.reason }}
      />
    );
  }

  return children;
}
