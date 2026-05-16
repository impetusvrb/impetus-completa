import React, { useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { isQualityOperationalRuntimeEnabled, getOperationalRuntimeSnapshot } from './qualityOperationalFeatureFlags.js';
import { QualityRealtimeStatusBar } from './QualityRealtimeStatusBar.jsx';

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

/**
 * Shell operacional — isolado da governação; não altera App.jsx quando importado por rotas futuras.
 */
export function QualityOperationalShell({
  companyId: companyIdProp,
  stationId,
  children,
  showStatusBar = true,
  /** WAVE 6 — rotas aninhadas: props via Outlet context (evita cloneElement no Outlet). */
  renderOutlet = false
}) {
  const companyId = companyIdProp || readCompanyIdFromStorage();
  const enabled = isQualityOperationalRuntimeEnabled();
  const snap = useMemo(() => getOperationalRuntimeSnapshot(), []);

  const outletCtx = useMemo(
    () => ({ companyId, stationId: stationId || null }),
    [companyId, stationId]
  );

  if (!enabled) {
    return (
      <div className="impetus-card" style={{ ...shellStyle, padding: '1rem', margin: '0.5rem', borderRadius: 4 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          Quality operational runtime desligado
        </p>
        <p style={{ color: 'var(--text-tertiary)', fontSize: 14 }}>Defina VITE_IMPETUS_QUALITY_OPERATIONAL_RUNTIME_ENABLED=true e flags no backend.</p>
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
    <div style={shellStyle} data-quality-operational-shell data-tenant={companyId} data-station={stationId || ''}>
      {showStatusBar ? <QualityRealtimeStatusBar companyId={companyId} flags={snap} /> : null}
      <div style={{ padding: '0.5rem 0.25rem' }}>
        {renderOutlet ? (
          <Outlet context={outletCtx} />
        ) : (
          React.Children.map(children, (c) =>
            React.isValidElement(c) ? React.cloneElement(c, { companyId, stationId: stationId || null }) : c
          )
        )}
      </div>
    </div>
  );
}

export default QualityOperationalShell;
