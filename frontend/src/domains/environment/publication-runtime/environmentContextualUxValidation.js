import { resolveEnvironmentUxDensity } from '../navigation/environmentAudienceNavigation.js';
import { resolveEnvironmentCapabilities } from './environmentCapabilityResolver.js';

export function validateEnvironmentContextualUx(ctx = {}) {
  const band = ctx.band || 'production';
  const density = resolveEnvironmentUxDensity(band);
  const caps = resolveEnvironmentCapabilities(ctx);
  const menuCount = Number(ctx.visible_menu_count) || 0;
  const overload = menuCount > 12;

  return {
    ok: !overload,
    band,
    density,
    cognitive_safe: density !== 'executive' || menuCount <= 8,
    capabilities: caps.capabilities,
    publication_safe: true,
    executive_safe: band !== 'operator' || !caps.capabilities.environment_executive
  };
}
