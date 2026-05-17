import { resolveSafetyVisibilityContext, resolveVisibleSafetyManifestItems } from './safetyVisibilityResolver.js';
import { noteSafetyNavigationResolutionMs } from '../../../observability/safetyOperationalTelemetry.js';
import { safetyNavDebug } from '../../../utils/safetyNavDebug.js';

export function resolveSafetyNavigationPublication(ctx) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const vis = resolveSafetyVisibilityContext(ctx);
  const items = resolveVisibleSafetyManifestItems(vis);
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (ctx.timing) noteSafetyNavigationResolutionMs(t1 - t0);
  safetyNavDebug('[SAFETY_NAVIGATION_RESOLUTION]', {
    band: vis.band,
    shouldPublishMenu: vis.shouldPublishMenu,
    menuItemCount: items.length
  });
  return { ...vis, menuItems: items };
}
