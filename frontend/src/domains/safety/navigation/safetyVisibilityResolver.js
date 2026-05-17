import { SAFETY_NAVIGATION_MANIFEST } from './safetyNavigationManifest.js';
import {
  isSafetyExecutiveVisibilityEnabled,
  isSafetyGovernanceVisibilityEnabled,
  isSafetyOperationalVisibilityEnabled,
  isSafetyPublicationRuntimeEnabled,
  isSafetyNavigationRuntimeEnabled
} from './safetyPublicationFeatureFlags.js';
import { resolveSafetyAudienceBand } from './safetyAudienceNavigation.js';

function userHasSafetyModule(visibleModules) {
  if (!Array.isArray(visibleModules)) return false;
  return visibleModules.includes('safety_intelligence');
}

export function resolveSafetyVisibilityContext(ctx) {
  const user = ctx.user || null;
  const band = resolveSafetyAudienceBand(user);
  const moduleOk = userHasSafetyModule(ctx.visibleModules);
  const flagsOn =
    isSafetyNavigationRuntimeEnabled() && isSafetyPublicationRuntimeEnabled() && moduleOk;

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
  if (r.operational && !isSafetyOperationalVisibilityEnabled()) return false;
  if (r.governance && !isSafetyGovernanceVisibilityEnabled()) return false;
  if (r.executive && !isSafetyExecutiveVisibilityEnabled()) return false;
  return true;
}

export function resolveVisibleSafetyManifestItems(vis) {
  const out = [];
  const seen = new Set();
  for (const m of SAFETY_NAVIGATION_MANIFEST) {
    if (!isManifestItemVisible(m, vis)) continue;
    const key = `${m.path}|${m.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  if (vis.band === 'production') {
    return out.filter((x) => x.id === 'safety_widgets_only').slice(0, 1);
  }
  return out;
}
