import { resolveQualityVisibilityContext, resolveVisibleQualityManifestItems } from './qualityVisibilityResolver.js';
import { noteQualityNavigationResolutionMs } from '../../../observability/qualityOperationalTelemetry.js';
import { qualityNavDebug } from '../../../utils/qualityNavDebug.js';

/**
 * @param {object} ctx
 * @param {object|null} ctx.user
 * @param {string[]} ctx.visibleModules
 * @param {object|null} [ctx.serverPublication]
 * @param {boolean} [ctx.timing=false]
 */
export function resolveQualityNavigationPublication(ctx) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const vis = resolveQualityVisibilityContext(ctx);
  const items = resolveVisibleQualityManifestItems(vis);
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (ctx.timing) noteQualityNavigationResolutionMs(t1 - t0);
  qualityNavDebug('[QUALITY_NAVIGATION_RESOLUTION]', {
    band: vis.band,
    shouldPublishMenu: vis.shouldPublishMenu,
    menuItemCount: items.length
  });
  return {
    ...vis,
    menuItems: items
  };
}
