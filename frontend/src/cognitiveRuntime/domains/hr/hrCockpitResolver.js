/**
 * Z.26 — Resolve cockpit RH people-native a partir de /dashboard/me
 */

export function resolveHrCockpitRuntime(meData = {}) {
  const runtime = meData?.hr_cognitive_runtime;
  if (!runtime?.consolidation_applied) return null;
  return {
    runtime,
    centers: meData?.hr_cognitive_centers || runtime.centers || [],
    decisionSupport: meData?.hr_decision_support || null,
    metrics: meData?.cockpit_operational_metrics || null,
    widgetsPromoted: meData?.widgets_promoted || [],
    health: runtime.hr_cognitive_health || null
  };
}

export default resolveHrCockpitRuntime;
