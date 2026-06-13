/**
 * AIOI-P6.3 — Executive Module Route (UI EXPERIENCE ONLY · composição P6.2)
 *
 * Resolve deep link corporativo e sincroniza secção com Navigation Provider.
 * Proibido consumo directo P5.x / P4.x.
 */

import React, { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { resolveExecutiveDeepLink } from './ExecutiveDeepLinkResolver.js';
import ExecutiveDeepLinkGuard from './ExecutiveDeepLinkGuard.jsx';

/**
 * @param {{
 *   children?: React.ReactNode,
 *   render?: (ctx: { moduleId: string, deepLink: object }) => React.ReactNode,
 *   pathname?: string
 * }} props
 */
export function ExecutiveModuleRoute({ children, render, pathname }) {
  const location = useLocation();
  const resolvedPath = pathname ?? location.pathname;

  const deepLink = useMemo(
    () => resolveExecutiveDeepLink(resolvedPath),
    [resolvedPath]
  );

  const moduleId = deepLink.module || 'executive_cockpit';

  return (
    <ExecutiveDeepLinkGuard deepLink={deepLink}>
      <div
        data-testid="executive-module-route"
        aria-label="Executive Module Route"
        data-executive-module={moduleId}
        data-executive-route={deepLink.route}
      >
        {render
          ? render({ moduleId, deepLink })
          : children}
      </div>
    </ExecutiveDeepLinkGuard>
  );
}

export default ExecutiveModuleRoute;
