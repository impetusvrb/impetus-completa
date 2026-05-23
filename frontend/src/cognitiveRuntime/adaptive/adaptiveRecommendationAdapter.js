export function applyRecommendationHints(context = {}, meData = {}) {
  const ao = meData?.adaptive_orchestration;
  if (!ao?.adaptation_recommended) return context;
  return {
    ...context,
    orchestration_advisory: true,
    auto_mutation_applied: ao.auto_mutation_applied === true
  };
}

export default applyRecommendationHints;
