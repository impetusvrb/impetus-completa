export function resolveAdaptiveOrchestration(meData = {}) {
  const ao = meData?.adaptive_orchestration;
  if (!ao) return null;
  return {
    adaptive_orchestration: ao,
    adaptation_recommended: ao.adaptation_recommended === true,
    fatigue_detected: ao.fatigue_detected === true,
    usefulness_score: ao.usefulness_score,
    recommendations_only: ao.auto_mutation_applied === false
  };
}

export default resolveAdaptiveOrchestration;
