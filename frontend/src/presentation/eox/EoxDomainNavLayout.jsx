import React from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import EoxModuleShell from './EoxModuleShell.jsx';

/**
 * ARC-003A — Adapter EOX (Enterprise Shell).
 *
 * EOX fornece apenas cabeçalho, breadcrumb, retornos e acções corporativas.
 * O layout, widgets e dashboards do domínio permanecem intactos abaixo.
 *
 * Reencaminha obrigatoriamente o Outlet context do *OperationalShell
 * (companyId, stationId, …) — sem isto os workspaces perdem tenant e regressam.
 */
export default function EoxDomainNavLayout({ useNavigation }) {
  const navConfig = useNavigation();
  const parentCtx = useOutletContext();

  return (
    <EoxModuleShell config={navConfig}>
      <Outlet context={parentCtx} />
    </EoxModuleShell>
  );
}
