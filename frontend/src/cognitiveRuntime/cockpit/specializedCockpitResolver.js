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

/** INC-038 — logistics_native resolver (inactive until consolidation_applied). */
export function resolveLogisticsCockpitRuntime(meData = {}) {
  const runtime = meData?.logistics_cognitive_runtime;
  if (!runtime?.consolidation_applied) return null;
  return {
    runtime,
    centers: meData?.logistics_cognitive_centers || runtime.centers || [],
    decisionSupport: meData?.logistics_decision_support || null,
    metrics: meData?.cockpit_operational_metrics || null,
    widgetsPromoted: meData?.widgets_promoted || [],
    health: runtime.logistics_cognitive_health || runtime.cognitive_health || null
  };
}

/** GF-001 — ppap_native resolver (inactive until consolidation_applied). */
export function resolvePpapCockpitRuntime(meData = {}) {
  const runtime = meData?.ppap_cognitive_runtime;
  if (!runtime?.consolidation_applied) return null;
  return {
    runtime,
    centers: meData?.ppap_cognitive_centers || runtime.centers || [],
    decisionSupport: meData?.ppap_decision_support || null,
    metrics: meData?.cockpit_operational_metrics || null,
    widgetsPromoted: meData?.widgets_promoted || [],
    health: runtime.ppap_cognitive_health || runtime.cognitive_health || null
  };
}

/** GF-011 — msa_native resolver (inactive until consolidation_applied). */
export function resolveMsaCockpitRuntime(meData = {}) {
  const runtime = meData?.msa_cognitive_runtime;
  if (!runtime?.consolidation_applied) return null;
  return {
    runtime,
    centers: meData?.msa_cognitive_centers || runtime.centers || [],
    decisionSupport: meData?.msa_decision_support || null,
    metrics: meData?.cockpit_operational_metrics || null,
    widgetsPromoted: meData?.widgets_promoted || [],
    health: runtime.msa_cognitive_health || runtime.cognitive_health || null
  };
}

/** GF-015 — ishikawa_native resolver (inactive until consolidation_applied). */
export function resolveIshikawaCockpitRuntime(meData = {}) {
  const runtime = meData?.ishikawa_cognitive_runtime;
  if (!runtime?.consolidation_applied) return null;
  return {
    runtime,
    centers: meData?.ishikawa_cognitive_centers || runtime.centers || [],
    decisionSupport: meData?.ishikawa_decision_support || null,
    metrics: meData?.cockpit_operational_metrics || null,
    widgetsPromoted: meData?.widgets_promoted || [],
    health: runtime.ishikawa_cognitive_health || runtime.cognitive_health || null
  };
}

/** GF-027 — supply_native resolver (inactive until consolidation_applied). */
export function resolveSupplyCockpitRuntime(meData = {}) {
  const runtime = meData?.supply_cognitive_runtime;
  if (!runtime?.consolidation_applied) return null;
  return {
    runtime,
    centers: meData?.supply_cognitive_centers || runtime.centers || [],
    decisionSupport: meData?.supply_decision_support || null,
    metrics: meData?.cockpit_operational_metrics || null,
    widgetsPromoted: meData?.widgets_promoted || [],
    health: runtime.supply_cognitive_health || runtime.cognitive_health || null
  };
}

export default resolveSpecializedCockpitRuntime;
