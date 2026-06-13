/**
 * AIOI-P6.0 — Executive Portal Route (READ ONLY · integração Router global)
 *
 * Composição exclusiva P5.5 — ExecutivePortalPage.
 * Proibido consumo directo P5.3 / P5.2 / P5.1 / P5.0 / P4.x.
 */

import React from 'react';
import ExecutivePortalPage from '../executive-portal/ExecutivePortalPage.jsx';
import {
  evaluateExecutivePortalRouteGuard,
  resolveExecutivePortalTenant
} from './ExecutivePortalRouteGuard.js';
import { EXECUTIVE_PORTAL_ROUTE_PATH } from './ExecutivePortalRouteRegistry.js';
import styles from './ExecutivePortalRoute.module.css';

function readStoredUser() {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('impetus_user') || '{}');
  } catch {
    return {};
  }
}

function ExecutivePortalRouteFallback({ reason, tenantLabel }) {
  const messages = {
    missing_company_id: 'Tenant não identificado. Selecione uma empresa para aceder ao Portal Executivo.',
    invalid_tenant: 'Identificador de tenant inválido. Contacte o administrador institucional.',
    portal_not_ready: 'Portal Executivo em consolidação. Prontidão P5.9 não confirmada.',
    default: 'Acesso ao Portal Executivo indisponível.'
  };

  return (
    <div
      className={styles.fallbackPanel}
      role="alert"
      aria-live="assertive"
      data-testid="executive-portal-route-fallback"
      aria-label="Executive Portal Access Fallback"
    >
      <p className={styles.fallbackEyebrow}>AIOI-P6.0 · READ ONLY</p>
      <h1 className={styles.fallbackTitle}>Portal Executivo</h1>
      <p className={styles.fallbackMessage}>{messages[reason] || messages.default}</p>
      <p className={styles.fallbackMeta}>
        Rota: {EXECUTIVE_PORTAL_ROUTE_PATH} · Tenant: {tenantLabel || '—'}
      </p>
    </div>
  );
}

/**
 * @param {{ user?: object, portalReadyChecker?: () => boolean, fetcher?: (companyId: string) => Promise<object> }} [props]
 */
export function ExecutivePortalRoute({ user, portalReadyChecker, fetcher }) {
  const resolvedUser = user ?? readStoredUser();
  const guard = evaluateExecutivePortalRouteGuard(resolvedUser, { portalReadyChecker });

  if (!guard.ok) {
    return (
      <ExecutivePortalRouteFallback reason={guard.reason} tenantLabel={guard.tenantLabel} />
    );
  }

  const { tenantLabel } = resolveExecutivePortalTenant(resolvedUser);

  return (
    <div
      data-testid="executive-portal-route"
      aria-label="Enterprise Executive Portal Route"
      className={styles.routeShell}
    >
      <ExecutivePortalPage
        companyId={guard.companyId}
        tenantLabel={tenantLabel}
        fetcher={fetcher}
      />
    </div>
  );
}

export default ExecutivePortalRoute;
