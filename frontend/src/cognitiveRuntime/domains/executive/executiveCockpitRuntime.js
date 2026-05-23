import { resolveExecutiveCockpitRuntime } from './executiveCockpitResolver';
import { applyExecutiveDensity } from './executiveDensityBalancer';
import { superviseExecutiveFallback } from './executiveFallbackRuntime';
import { validateExecutiveSemantics } from './executiveSemanticRuntime';

export function runExecutiveCockpitRuntime(meData = {}) {
  const resolved = resolveExecutiveCockpitRuntime(meData);
  if (!resolved) return { active: false, fallback: superviseExecutiveFallback(null) };
  const density = applyExecutiveDensity(resolved.centers, resolved.widgetsPromoted);
  const semantic = validateExecutiveSemantics(meData);
  return {
    active: true,
    ...resolved,
    density,
    semantic,
    fallback: superviseExecutiveFallback(resolved.runtime)
  };
}

export default runExecutiveCockpitRuntime;
