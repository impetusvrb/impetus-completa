/**
 * Z.25 — Resolve cockpit SST a partir de /dashboard/me
 */

export function resolveSafetyCockpitRuntime(meData = {}) {
  const runtime = meData?.sst_cognitive_runtime;
  if (!runtime?.consolidation_applied) return null;
  return {
    runtime,
    centers: meData?.safety_cognitive_centers || runtime.centers || [],
    decisionSupport: meData?.safety_decision_support || null,
    metrics: meData?.cockpit_operational_metrics || null,
    widgetsPromoted: meData?.widgets_promoted || [],
    health: runtime.safety_cognitive_health || null
  };
}

export default resolveSafetyCockpitRuntime;
