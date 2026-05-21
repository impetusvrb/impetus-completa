'use strict';

function kpiKey(k) {
  return String(k?.id || k?.key || k?.label || k?.title || '').toLowerCase();
}

function traceKpiDelivery(input = {}, ctx = {}) {
  const original = Array.isArray(input.original_kpis) ? input.original_kpis : [];
  const keys = (arr) => arr.map(kpiKey).filter(Boolean);

  let current = [...original];
  const trace = [];
  let order = 0;

  const push = (stage, source, before, after, opts = {}) => {
    order += 1;
    const b = keys(before);
    const a = keys(after);
    trace.push({
      stage,
      source,
      execution_order: order,
      kpi_count_before: before.length,
      kpi_count_after: after.length,
      added: a.filter((k) => !b.includes(k)),
      removed: b.filter((k) => !a.includes(k)),
      governance_applied: opts.governance_applied === true,
      fallback_applied: opts.fallback_applied === true,
      timestamp: new Date().toISOString()
    });
    current = after;
  };

  push('dashboard_kpis_raw', 'dashboardKPIs', [], current);
  if (input.after_personalization) push('personalization', 'dashboardComposer', current, input.after_personalization);
  if (input.after_cognitive_governance) {
    push('cognitive_governance', 'cognitiveGovernanceFacade', current, input.after_cognitive_governance, {
      governance_applied: true
    });
  }
  if (input.after_kpi_rollout) push('kpi_rollout', 'kpiRolloutFacade', current, input.after_kpi_rollout);
  if (input.after_z5) {
    push('kpi_runtime_enforcement_Z5', 'kpiRuntimeEnforcement', current, input.after_z5, { governance_applied: true });
  }
  if (input.after_z6) push('kpi_stability_Z6', 'kpiRuntimeStability', current, input.after_z6);
  if (input.after_z7) push('kpi_convergence_Z7', 'kpiConvergence', current, input.after_z7);

  const finalKpis = input.final_kpis || current;
  const finalKeys = keys(finalKpis);
  const origKeys = keys(original);
  const duplicates = finalKeys.filter((k, i) => finalKeys.indexOf(k) !== i);

  const execLeak = finalKpis.filter((k) => {
    const key = kpiKey(k);
    return /faturamento|lucro|oee|revenue|profit/i.test(key) && (ctx.domain_axis === 'quality' || ctx.hierarchy_tier === 'coordination');
  });

  return {
    kpi_delivery_audit: {
      original_kpis: origKeys,
      contextual_filtered: trace.find((t) => t.stage === 'cognitive_governance')?.removed || [],
      removed_by_governance: trace.flatMap((t) => t.removed),
      restored_by_hardening: trace.filter((t) => t.fallback_applied).flatMap((t) => t.added),
      final_kpis: finalKeys,
      leakage_detected: execLeak.length > 0,
      governance_conflicts: execLeak.map((k) => ({ kpi: kpiKey(k), reason: 'executive_kpi_on_operational_profile' })),
      duplicate_sources: [...new Set(duplicates)]
    },
    trace,
    executive_leakage: execLeak.length
  };
}

module.exports = { traceKpiDelivery, kpiKey };
