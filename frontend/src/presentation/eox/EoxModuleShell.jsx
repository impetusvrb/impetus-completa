import React from 'react';
import EoxHeader from './EoxHeader.jsx';
import { EoxNavigationContext } from './EoxNavigationContext.jsx';
import { EOX_PHASE } from './eoxTokens.js';
import './eox.css';

/**
 * ARC-003 / ARC-003A — Enterprise Shell (casco corporativo).
 * Nunca substitui layouts, widgets ou dashboards de domínio — apenas envolve o conteúdo.
 */
export default function EoxModuleShell({ config, children }) {
  if (!config) return children;

  return (
    <EoxNavigationContext.Provider
      value={{
        active: true,
        suppressModuleHeader: true,
        suppressHubHeader: true,
        phase: config.eoxPhase || EOX_PHASE
      }}
    >
      <div
        className="eox-module-shell operational-module-shell"
        data-eox-shell="true"
        data-eox-phase={config.eoxPhase || EOX_PHASE}
      >
        <EoxHeader {...config} />
        <div className="eox-module-shell-content operational-module-shell-content">{children}</div>
      </div>
    </EoxNavigationContext.Provider>
  );
}
