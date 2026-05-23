import { resolveEnvironmentalCockpitRuntime } from './environmentalCockpitResolver';
import { applyEnvironmentalDensity } from './environmentalDensityBalancer';
import { superviseEnvironmentalFallback } from './environmentalFallbackRuntime';
import { validateEnvironmentalSemantics } from './environmentalSemanticRuntime';

export function buildEnvironmentalCockpitView(meData = {}) {
  const resolved = resolveEnvironmentalCockpitRuntime(meData);
  if (!resolved) return null;
  const density = applyEnvironmentalDensity(resolved.centers, resolved.widgetsPromoted);
  const semantic = validateEnvironmentalSemantics(resolved);
  const fallback = superviseEnvironmentalFallback(resolved, density);
  return { ...resolved, density, semantic, fallback };
}

export default buildEnvironmentalCockpitView;
