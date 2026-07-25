import React from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import { EoxModuleShell, useLogisticsOperationalNavigation } from '../../../presentation/eox/index.js';

/**
 * NAV-002 / ARC-003A — EOX shell para WMS standalone.
 * Reencaminha contexto quando presente (compatível com rotas aninhadas futuras).
 */
export default function WmsOperationalNavLayout() {
  const navConfig = useLogisticsOperationalNavigation();
  const parentCtx = useOutletContext();

  return (
    <EoxModuleShell config={navConfig}>
      <Outlet context={parentCtx} />
    </EoxModuleShell>
  );
}
