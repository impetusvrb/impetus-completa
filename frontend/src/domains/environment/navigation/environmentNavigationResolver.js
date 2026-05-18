import { resolveEnvironmentVisibilityContext, resolveVisibleEnvironmentManifestItems } from './environmentVisibilityResolver.js';
import { noteEnvironmentNavigationResolutionMs } from '../../../observability/environmentOperationalTelemetry.js';

export function resolveEnvironmentNavigationPublication(ctx) {
  const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const vis = resolveEnvironmentVisibilityContext(ctx);
  const items = resolveVisibleEnvironmentManifestItems(vis);
  const t1 = typeof performance !== 'undefined' ? performance.now() : Date.now();
  if (ctx.timing) noteEnvironmentNavigationResolutionMs(t1 - t0);
  return { ...vis, menuItems: items };
}
