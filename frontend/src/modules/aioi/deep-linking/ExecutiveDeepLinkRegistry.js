/**
 * AIOI-P6.3 — Executive Deep Link Registry (UI EXPERIENCE ONLY · READ ONLY)
 */

export const EXECUTIVE_DEEP_LINK_BASE = '/executive-portal';

export const EXECUTIVE_DEEP_LINKS = [
  {
    route: '/executive-portal',
    segment: '',
    module: 'executive_cockpit',
    available: true
  },
  {
    route: '/executive-portal/cockpit',
    segment: 'cockpit',
    module: 'executive_cockpit',
    available: true
  },
  {
    route: '/executive-portal/decision-visualization',
    segment: 'decision-visualization',
    module: 'decision_visualization',
    available: true
  },
  {
    route: '/executive-portal/interface-intelligence',
    segment: 'interface-intelligence',
    module: 'interface_intelligence',
    available: true
  },
  {
    route: '/executive-portal/executive-reports',
    segment: 'executive-reports',
    module: 'executive_reports',
    available: true
  }
];

/**
 * @param {string} moduleId
 * @returns {object|null}
 */
export function getExecutiveDeepLinkByModule(moduleId) {
  return EXECUTIVE_DEEP_LINKS.find((entry) => entry.module === moduleId) || null;
}

/**
 * @param {string} route
 * @returns {object|null}
 */
export function getExecutiveDeepLinkByRoute(route) {
  const normalized = normalizeExecutiveDeepLinkPath(route);
  return EXECUTIVE_DEEP_LINKS.find((entry) => entry.route === normalized) || null;
}

/**
 * @param {string} pathname
 * @returns {string}
 */
export function normalizeExecutiveDeepLinkPath(pathname) {
  if (!pathname) return EXECUTIVE_DEEP_LINK_BASE;
  const trimmed = String(pathname).replace(/\/+$/, '') || '/';
  return trimmed === '' ? EXECUTIVE_DEEP_LINK_BASE : trimmed;
}

export default EXECUTIVE_DEEP_LINKS;
