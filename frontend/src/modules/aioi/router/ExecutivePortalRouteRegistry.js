/**
 * AIOI-P6.0 — Executive Portal Route Registry (READ ONLY · composição P5.5)
 *
 * component: ExecutivePortalPage — resolvido em ExecutivePortalRoute.jsx (único ponto de composição).
 */

export const EXECUTIVE_PORTAL_ROUTE_PATH = '/executive-portal';

export const EXECUTIVE_PORTAL_ROUTE_COMPONENT = 'ExecutivePortalPage';

export const EXECUTIVE_PORTAL_ROUTE_REGISTRY = {
  path: EXECUTIVE_PORTAL_ROUTE_PATH,
  component: EXECUTIVE_PORTAL_ROUTE_COMPONENT,
  mode: 'read_only'
};

/**
 * @returns {typeof EXECUTIVE_PORTAL_ROUTE_REGISTRY}
 */
export function getExecutivePortalRouteDefinition() {
  return EXECUTIVE_PORTAL_ROUTE_REGISTRY;
}

/**
 * @returns {boolean}
 */
export function isExecutivePortalRoutePath(pathname) {
  if (!pathname) return false;
  const normalized = String(pathname).replace(/\/+$/, '') || '/';
  return normalized === EXECUTIVE_PORTAL_ROUTE_PATH;
}

export default EXECUTIVE_PORTAL_ROUTE_REGISTRY;
