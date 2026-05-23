export function resolveEnvironmentalCockpitRuntime(meData = {}) {
  const runtime = meData?.environmental_cognitive_runtime;
  if (!runtime?.consolidation_applied) return null;
  return {
    runtime,
    centers: meData?.environmental_cognitive_centers || runtime.centers || [],
    decisionSupport: meData?.environmental_decision_support || null,
    widgetsPromoted: meData?.widgets_promoted || [],
    health: runtime.environmental_cognitive_health || null
  };
}

export default resolveEnvironmentalCockpitRuntime;
