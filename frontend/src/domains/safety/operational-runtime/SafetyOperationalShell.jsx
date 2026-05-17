import React, { useEffect, useMemo } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { markSafetyRouteOpen } from '../analytics/safetyOperationalBehaviorAnalytics.js';
import { isSafetyOperationalRuntimeEnabled } from './safetyOperationalFeatureFlags.js';

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

export function SafetyOperationalShell({ companyId: companyIdProp, stationId, children, renderOutlet = false }) {
  const location = useLocation();
  const companyId = companyIdProp || readCompanyIdFromStorage();
  const enabled = isSafetyOperationalRuntimeEnabled();

  useEffect(() => {
    if (!enabled) return;
    markSafetyRouteOpen(location.pathname + location.search);
  }, [enabled, location.pathname, location.search]);

  const outletCtx = useMemo(
    () => ({ companyId, stationId: stationId || null }),
    [companyId, stationId]
  );

  if (!enabled) {
    return (
      <div className="impetus-card" style={{ ...shellStyle, padding: '1rem', margin: '0.5rem', borderRadius: 4 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          SST operational runtime desligado
        </p>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Defina VITE_IMPETUS_SAFETY_OPERATIONAL_RUNTIME_ENABLED=true e flags no backend.</p>
      </div>
    );
  }

  if (!companyId) {
    return (
      <div className="impetus-card" style={{ ...shellStyle, padding: '1rem', margin: '0.5rem', borderRadius: 4 }}>
        <p style={{ color: 'var(--amber)' }}>Tenant não resolvido — inicie sessão com empresa vinculada.</p>
      </div>
    );
  }

  return (
    <div style={shellStyle} data-safety-operational-shell data-tenant={companyId} data-station={stationId || ''}>
      <div style={{ padding: '0.5rem 0.25rem' }}>
        {renderOutlet ? <Outlet context={outletCtx} /> : children}
      </div>
    </div>
  );
}

export default SafetyOperationalShell;
