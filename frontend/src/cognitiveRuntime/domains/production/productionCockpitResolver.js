/**
 * Z.P0 — Resolve cockpit produção production-native a partir de /dashboard/me
 */

export function resolveProductionCockpitRuntime(meData = {}) {
  const runtime = meData?.production_cognitive_runtime;
  if (!runtime?.consolidation_applied) return null;
  return {
    runtime,
    centers: meData?.production_cognitive_centers || runtime.centers || [],
    decisionSupport: meData?.production_decision_support || null,
    metrics: meData?.cockpit_operational_metrics || null,
    widgetsPromoted: meData?.widgets_promoted || [],
    health: runtime.production_cognitive_health || null,
    telemetryReadiness: runtime.telemetry_readiness || null
  };
}

export default resolveProductionCockpitRuntime;
