import { QUALITY_NAVIGATION_MANIFEST } from './qualityNavigationManifest.js';
import {
  isQualityExecutiveVisibilityEnabled,
  isQualityGovernanceVisibilityEnabled,
  isQualityOperationalVisibilityEnabled,
  isQualityPublicationRuntimeEnabled,
  isQualityNavigationRuntimeEnabled
} from './qualityPublicationFeatureFlags.js';
import { resolveQualityAudienceBand } from './qualityAudienceNavigation.js';

function userHasQualityModule(visibleModules) {
  if (!Array.isArray(visibleModules)) return false;
  return visibleModules.includes('quality_intelligence');
}

/**
 * @param {object} ctx
 * @param {object|null} ctx.user
 * @param {string[]} ctx.visibleModules
 * @param {object|null} [ctx.serverPublication]
 */
export function resolveQualityVisibilityContext(ctx) {
  const user = ctx.user || null;
  const band = resolveQualityAudienceBand(user);
  const moduleOk = userHasQualityModule(ctx.visibleModules);
  const flagsOn =
    isQualityNavigationRuntimeEnabled() && isQualityPublicationRuntimeEnabled() && moduleOk;

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

/**
 * @param {import('./qualityNavigationManifest.js').QualityNavManifestItem} item
 * @param {ReturnType<typeof resolveQualityVisibilityContext>} vis
 */
export function isManifestItemVisible(item, vis) {
  if (!vis.shouldPublishMenu) return false;
  if (!item.bands.includes(vis.band)) return false;
  const r = item.requires || {};
  if (r.operational && !isQualityOperationalVisibilityEnabled()) return false;
  if (r.governance && !isQualityGovernanceVisibilityEnabled()) return false;
  if (r.executive && !isQualityExecutiveVisibilityEnabled()) return false;
  return true;
}

/**
 * Itens visíveis ordenados e dedupe por path.
 * @param {ReturnType<typeof resolveQualityVisibilityContext>} vis
 */
export function resolveVisibleQualityManifestItems(vis) {
  const out = [];
  const seen = new Set();
  for (const m of QUALITY_NAVIGATION_MANIFEST) {
    if (!isManifestItemVisible(m, vis)) continue;
    const key = `${m.path}|${m.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  if (vis.band === 'production') {
    return out.filter((x) => x.id === 'quality_widgets_only').slice(0, 1);
  }
  return out;
}
