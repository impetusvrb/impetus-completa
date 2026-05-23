/**
 * Z.P0 — Runtime frontend produção (sem CSS novo)
 */

import { resolveProductionCockpitRuntime } from './productionCockpitResolver';
import { applyProductionDensity } from './productionDensityBalancer';
import { superviseProductionFallback } from './productionFallbackRuntime';
import { validateProductionSemantics } from './productionSemanticRuntime';

export function buildProductionCockpitView(meData = {}) {
  const resolved = resolveProductionCockpitRuntime(meData);
  if (!resolved) return null;
  const density = applyProductionDensity(resolved.centers, resolved.widgetsPromoted);
  const semantic = validateProductionSemantics(resolved);
  const fallback = superviseProductionFallback(resolved, density);
  return { ...resolved, density, semantic, fallback };
}

export default buildProductionCockpitView;
