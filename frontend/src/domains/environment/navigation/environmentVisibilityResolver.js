import { ENVIRONMENT_NAVIGATION_MANIFEST } from './environmentNavigationManifest.js';
import {
  isEnvironmentExecutiveVisibilityEnabled,
  isEnvironmentGovernanceVisibilityEnabled,
  isEnvironmentOperationalVisibilityEnabled,
  isEnvironmentPublicationRuntimeEnabled,
  isEnvironmentNavigationRuntimeEnabled
} from './environmentPublicationFeatureFlags.js';
import { resolveEnvironmentAudienceBand, shouldPublishEnvironmentNavigation } from './environmentAudienceNavigation.js';

function userHasEnvironmentModule(visibleModules) {
  if (!Array.isArray(visibleModules)) return false;
  return visibleModules.includes('environment_intelligence');
}

export function resolveEnvironmentVisibilityContext(ctx) {
  const user = ctx.user || null;
  if (user && !shouldPublishEnvironmentNavigation(user)) {
    return {
      band: 'production',
      moduleOk: false,
      flagsOn: false,
      serverBlocks: true,
      shouldPublishMenu: false,
      serverPublication: ctx.serverPublication || null,
      safety_domain_isolation: true
    };
  }
  const band = resolveEnvironmentAudienceBand(user);
  const moduleOk = userHasEnvironmentModule(ctx.visibleModules);
  const flagsOn =
    isEnvironmentNavigationRuntimeEnabled() && isEnvironmentPublicationRuntimeEnabled() && moduleOk;

  const server = ctx.serverPublication;
  const serverBlocks = !!(server && server.ok === true && server.publication_allowed === false);
  const shouldPublishMenu = flagsOn && !serverBlocks && (server == null || server.publication_allowed !== false);

  return {
    band,
    moduleOk,
    flagsOn,
    serverBlocks,
    shouldPublishMenu,
    serverPublication: server || null
  };
}

export function isManifestItemVisible(item, vis) {
  if (!vis.shouldPublishMenu) return false;
  if (!item.bands.includes(vis.band)) return false;
  const r = item.requires || {};
  if (r.operational && !isEnvironmentOperationalVisibilityEnabled()) return false;
  if (r.governance && !isEnvironmentGovernanceVisibilityEnabled()) return false;
  if (r.executive && !isEnvironmentExecutiveVisibilityEnabled()) return false;
  return true;
}

export function resolveVisibleEnvironmentManifestItems(vis) {
  const out = [];
  const seen = new Set();
  for (const m of ENVIRONMENT_NAVIGATION_MANIFEST) {
    if (!isManifestItemVisible(m, vis)) continue;
    const key = `${m.path}|${m.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  if (vis.band === 'production') {
    return out.filter((x) => x.id === 'environment_widgets_only').slice(0, 1);
  }
  return out;
}
