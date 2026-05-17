import { LOGISTICS_NAVIGATION_MANIFEST } from './logisticsNavigationManifest.js';
import {
  isLogisticsExecutiveVisibilityEnabled,
  isLogisticsGovernanceVisibilityEnabled,
  isLogisticsOperationalVisibilityEnabled,
  isLogisticsPublicationRuntimeEnabled,
  isLogisticsNavigationRuntimeEnabled
} from './logisticsPublicationFeatureFlags.js';
import { resolveLogisticsAudienceBand } from './logisticsAudienceNavigation.js';

function userHasLogisticsModule(visibleModules) {
  if (!Array.isArray(visibleModules)) return false;
  return visibleModules.includes('logistics_intelligence');
}

export function resolveLogisticsVisibilityContext(ctx) {
  const user = ctx.user || null;
  const band = resolveLogisticsAudienceBand(user);
  const moduleOk = userHasLogisticsModule(ctx.visibleModules);
  const flagsOn =
    isLogisticsNavigationRuntimeEnabled() && isLogisticsPublicationRuntimeEnabled() && moduleOk;

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
  if (r.operational && !isLogisticsOperationalVisibilityEnabled()) return false;
  if (r.governance && !isLogisticsGovernanceVisibilityEnabled()) return false;
  if (r.executive && !isLogisticsExecutiveVisibilityEnabled()) return false;
  return true;
}

export function resolveVisibleLogisticsManifestItems(vis) {
  const out = [];
  const seen = new Set();
  for (const m of LOGISTICS_NAVIGATION_MANIFEST) {
    if (!isManifestItemVisible(m, vis)) continue;
    const key = `${m.path}|${m.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  if (vis.band === 'production') {
    return out.filter((x) => x.id === 'logistics_widgets_only').slice(0, 1);
  }
  return out;
}
