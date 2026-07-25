import React from 'react';
import { Navigate } from 'react-router-dom';
import { isLogisticsWorkspaceEnabled } from '../config/wmsFeatureFlags.js';

/**
 * WMS-007A — Gate técnico invisível (flags apenas, sem UI de workspace).
 */
export function WmsStandaloneGate({ children }) {
  if (!isLogisticsWorkspaceEnabled()) {
    return <Navigate to="/app" replace />;
  }
  return (
    <div
      data-wms-standalone-gate
      data-wms-phase="WMS-007A"
      style={{ minHeight: '100%', background: 'var(--bg-primary)', color: 'var(--text-primary)', padding: '0.5rem' }}
    >
      {children}
    </div>
  );
}

/** @deprecated alias WMS-004 */
export const WmsWorkspaceGate = WmsStandaloneGate;

export default WmsStandaloneGate;
