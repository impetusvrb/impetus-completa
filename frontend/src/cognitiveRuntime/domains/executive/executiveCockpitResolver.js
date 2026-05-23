export function resolveExecutiveCockpitRuntime(meData = {}) {
  const runtime = meData?.executive_cognitive_runtime;
  if (!runtime?.consolidation_applied) return null;
  return {
    runtime,
    centers: meData?.executive_cognitive_centers || runtime.centers || [],
    decisionSupport: meData?.executive_decision_support || null,
    widgetsPromoted: meData?.widgets_promoted || [],
    health: runtime.executive_cognitive_health || null
  };
}

export default resolveExecutiveCockpitRuntime;
