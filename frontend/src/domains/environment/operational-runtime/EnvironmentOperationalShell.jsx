import React, { useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { isEnvironmentOperationalRuntimeEnabled } from './environmentOperationalFeatureFlags.js';
import { markEnvironmentRouteOpen } from '../analytics/environmentOperationalBehaviorAnalytics.js';

const shellStyle = {
  minHeight: '100%',
  background: 'var(--bg-primary)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-display), sans-serif'
};

function readCompanyIdFromStorage() {
  try {
    const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
    return u.company_id || null;
  } catch {
    return null;
  }
}

export function EnvironmentOperationalShell({ companyId: companyIdProp, children, renderOutlet = false }) {
  const location = useLocation();
  const companyId = companyIdProp || readCompanyIdFromStorage();
  const enabled = isEnvironmentOperationalRuntimeEnabled();

  useEffect(() => {
    if (!enabled) return;
    markEnvironmentRouteOpen(location.pathname + location.search);
  }, [enabled, location.pathname, location.search]);

  const outletCtx = useMemo(() => ({ companyId }), [companyId]);

  if (!enabled) {
    return (
      <div className="impetus-card" style={{ ...shellStyle, padding: '1rem', margin: '0.5rem', borderRadius: 4 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          Ambiental operational runtime desligado
        </p>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="impetus-card" style={{ ...shellStyle, padding: '1rem', margin: '0.5rem', borderRadius: 4 }}>
        <p style={{ color: 'var(--amber)' }}>Tenant não resolvido.</p>
      </div>
    );
  }

  return (
    <div style={shellStyle} data-environment-operational-shell data-tenant={companyId}>
      <div style={{ padding: '0.5rem 0.25rem' }}>
        {renderOutlet ? <Outlet context={outletCtx} /> : children}
      </div>
    </div>
  );
}

export default EnvironmentOperationalShell;
