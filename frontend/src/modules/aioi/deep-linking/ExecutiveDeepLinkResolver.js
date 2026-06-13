/**
 * AIOI-P6.3 — Executive Deep Link Resolver (UI EXPERIENCE ONLY · READ ONLY)
 */

import {
  EXECUTIVE_DEEP_LINK_BASE,
  EXECUTIVE_DEEP_LINKS,
  getExecutiveDeepLinkByRoute,
  normalizeExecutiveDeepLinkPath
} from './ExecutiveDeepLinkRegistry.js';

export const DEFAULT_EXECUTIVE_DEEP_LINK_MODULE = 'executive_cockpit';

/**
 * @param {string} pathname
 * @returns {{
 *   ok: boolean,
 *   route: string,
 *   module: string|null,
 *   available: boolean,
 *   segment: string|null
 * }}
 */
export function resolveExecutiveDeepLink(pathname) {
  const route = normalizeExecutiveDeepLinkPath(pathname);
  const entry = getExecutiveDeepLinkByRoute(route);

  if (!entry) {
    return {
      ok: false,
      route,
      module: null,
      available: false,
      segment: null
    };
  }

  return {
    ok: true,
    route: entry.route,
    module: entry.module,
    available: entry.available === true,
    segment: entry.segment || null
  };
}

/**
 * @param {string} moduleId
 * @returns {object|null}
 */
export function resolveExecutiveDeepLinkByModule(moduleId) {
  const entry = EXECUTIVE_DEEP_LINKS.find((link) => link.module === moduleId && link.available);
  if (!entry) return null;
  return {
    ok: true,
    route: entry.route,
    module: entry.module,
    available: true,
    segment: entry.segment || null
  };
}

/**
 * @param {string} pathname
 * @returns {string}
 */
export function resolveExecutiveNavigationSectionFromPath(pathname) {
  const resolved = resolveExecutiveDeepLink(pathname);
  if (resolved.ok && resolved.module) {
    return resolved.module;
  }
  return DEFAULT_EXECUTIVE_DEEP_LINK_MODULE;
}

export default resolveExecutiveDeepLink;
