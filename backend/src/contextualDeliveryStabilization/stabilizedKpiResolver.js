'use strict';

function resolveStabilizedKpis(kpis, user, ctx = {}) {
  const axis = ctx.domain || ctx.functional_axis;
  const items = Array.isArray(kpis) ? kpis : kpis?.kpis || [];
  const scored = items.map((k) => {
    const id = k.id || k.key || k.name;
    const domainOk = !k.domain || k.domain === axis || k.domain === 'shared';
    const corporate = k.generic_fallback || k.corporate_aggregate;
    const allowed = domainOk && !corporate;
    return {
      kpi_id: id,
      allowed,
      authority_trace: 'stabilized_kpi_resolver',
      contextual_confidence: allowed ? 0.88 : 0.25,
      runtime_truth_reference: ctx.runtime_truth_axis || axis
    };
  });
  const eligible = scored.filter((s) => s.allowed);
  return {
    kpis: items,
    stabilized_kpis: eligible.map((e) => e.kpi_id),
    KPI_targeting_precision: items.length ? eligible.length / items.length : 1,
    denied: scored.filter((s) => !s.allowed),
    authority_trace: 'unified_contextual_delivery'
  };
}

module.exports = { resolveStabilizedKpis };
