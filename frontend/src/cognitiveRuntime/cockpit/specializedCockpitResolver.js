/**
 * Z.23 — Resolve runtime de cockpit especializado a partir de /dashboard/me
 */

export function resolveSpecializedCockpitRuntime(meData = {}) {
  const runtime = meData?.specialized_cockpit_runtime;
  if (!runtime?.consolidation_applied) return null;
  return {
    runtime,
    centers: meData?.quality_cognitive_centers || runtime.centers || [],
    decisionSupport: meData?.quality_decision_support || null,
    metrics: meData?.cockpit_operational_metrics || null,
    widgetsPromoted: meData?.widgets_promoted || [],
    health: runtime.cognitive_health || null
  };
}

export default resolveSpecializedCockpitRuntime;
