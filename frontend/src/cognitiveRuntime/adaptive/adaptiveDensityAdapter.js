export function applyAdaptiveDensityHints(context = {}, adaptive = null) {
  if (!adaptive?.adaptive_orchestration) return context;
  const suggestions = adaptive.adaptive_orchestration.density_adjustment_suggested || [];
  return {
    ...context,
    adaptive_density_hints: suggestions,
    density_advisory: suggestions.length > 0 ? 'review_recommended' : 'ok'
  };
}

export default applyAdaptiveDensityHints;
