import { resolveAdaptiveOrchestration } from './adaptiveOrchestrationResolver';
import { applyAdaptiveDensityHints } from './adaptiveDensityAdapter';
import { applyUsefulnessHints } from './adaptiveUsefulnessAdapter';
import { applyRecommendationHints } from './adaptiveRecommendationAdapter';
import { superviseAdaptiveFallback } from './adaptiveFallbackAdapter';

export function enrichContextWithAdaptiveOrchestration(context, meData = {}) {
  const adaptive = resolveAdaptiveOrchestration(meData);
  if (!adaptive) return context;
  let enriched = { ...context, adaptive_orchestration: adaptive.adaptive_orchestration };
  enriched = applyAdaptiveDensityHints(enriched, adaptive);
  enriched = applyUsefulnessHints(enriched, adaptive.adaptive_orchestration);
  enriched = applyRecommendationHints(enriched, meData);
  enriched.adaptive_fallback = superviseAdaptiveFallback(meData);
  return enriched;
}

export default enrichContextWithAdaptiveOrchestration;
