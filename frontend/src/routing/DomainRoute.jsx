/**
 * WAVE 6 — DomainRoute: wrapper de rota domain-aware.
 * Scaffolding para futuros domínios industriais.
 * Não altera rotas existentes em App.jsx.
 */

import React, { Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { getDomain } from '../domains/domainRegistry';

function DomainLoader() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        background: 'var(--bg-primary, #070c14)',
        color: 'var(--cyan, #00d4ff)',
        fontFamily: 'Rajdhani, sans-serif',
        fontSize: '13px',
        letterSpacing: '0.12em',
        textTransform: 'uppercase'
      }}
    >
      <div className="domain-loader-spinner" />
      <span style={{ marginLeft: 10 }}>Carregando módulo…</span>
    </div>
  );
}

/**
 * @param {{ domainId: string, component: React.ComponentType, fallbackPath?: string }} props
 */
export default function DomainRoute({ domainId, component: Component, fallbackPath = '/app' }) {
  const domain = getDomain(domainId);
  if (!domain) {
    console.warn('[DOMAIN_ROUTE] Unknown domain:', domainId);
    return <Navigate to={fallbackPath} replace />;
  }

  return (
    <Suspense fallback={<DomainLoader />}>
      <Component />
    </Suspense>
  );
}
