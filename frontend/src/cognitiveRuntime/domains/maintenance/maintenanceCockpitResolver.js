export function resolveMaintenanceCockpitRuntime(meData = {}) {
  const runtime = meData?.maintenance_cognitive_runtime;
  if (!runtime?.consolidation_applied) return null;
  return {
    runtime,
    centers: meData?.maintenance_cognitive_centers || runtime.centers || [],
    decisionSupport: meData?.maintenance_decision_support || null,
    widgetsPromoted: meData?.widgets_promoted || [],
    health: runtime.maintenance_cognitive_health || null,
    liveValidation: meData?.maintenance_live_validation || null
  };
}

export default resolveMaintenanceCockpitRuntime;
