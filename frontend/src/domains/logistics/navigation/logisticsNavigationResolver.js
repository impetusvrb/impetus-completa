import { resolveLogisticsVisibilityContext, resolveVisibleLogisticsManifestItems } from './logisticsVisibilityResolver.js';
import { noteLogisticsNavigationResolutionMs } from '../../../observability/logisticsOperationalTelemetry.js';

export function resolveLogisticsNavigationPublication(ctx) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const vis = resolveLogisticsVisibilityContext(ctx);
  const items = resolveVisibleLogisticsManifestItems(vis);
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (ctx.timing) noteLogisticsNavigationResolutionMs(t1 - t0);
  return { ...vis, menuItems: items };
}
