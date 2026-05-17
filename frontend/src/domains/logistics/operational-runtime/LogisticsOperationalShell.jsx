import React, { useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { isLogisticsOperationalRuntimeEnabled } from './logisticsOperationalFeatureFlags.js';
import { markLogisticsRouteOpen } from '../analytics/logisticsOperationalBehaviorAnalytics.js';

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

export function LogisticsOperationalShell({ companyId: companyIdProp, children, renderOutlet = false }) {
  const location = useLocation();
  const companyId = companyIdProp || readCompanyIdFromStorage();
  const enabled = isLogisticsOperationalRuntimeEnabled();

  useEffect(() => {
    if (!enabled) return;
    markLogisticsRouteOpen(location.pathname + location.search);
  }, [enabled, location.pathname, location.search]);

  const outletCtx = useMemo(() => ({ companyId }), [companyId]);

  if (!enabled) {
    return (
      <div className="impetus-card" style={{ ...shellStyle, padding: '1rem', margin: '0.5rem', borderRadius: 4 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
          Logística operational runtime desligado
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
    <div style={shellStyle} data-logistics-operational-shell data-tenant={companyId}>
      <div style={{ padding: '0.5rem 0.25rem' }}>
        {renderOutlet ? <Outlet context={outletCtx} /> : children}
      </div>
    </div>
  );
}

export default LogisticsOperationalShell;
