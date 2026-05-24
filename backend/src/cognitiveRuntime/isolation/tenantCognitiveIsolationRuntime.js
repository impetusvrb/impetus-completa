'use strict';

function evaluateTenantCognitiveIsolation(user = {}, payload = {}, ctx = {}) {
  const tenantId = user?.company_id;
  const ctxTenant = ctx.tenant_id || payload.company_id;

  const cross_tenant_leakage = tenantId && ctxTenant && String(tenantId) !== String(ctxTenant);
  const memory_contamination_detected =
    cross_tenant_leakage ||
    (payload.operational_context_runtime?.events_sample || []).some(
      (e) => e.company_id && tenantId && String(e.company_id) !== String(tenantId)
    );

  const runtime_overlap_detected =
    ctx.previous_tenant_payload &&
    tenantId &&
    ctx.previous_tenant_id &&
    String(ctx.previous_tenant_id) !== String(tenantId) &&
    payload.specialized_summary === ctx.previous_tenant_payload.specialized_summary;

  const isolation_integrity_score = Number(
    (cross_tenant_leakage || memory_contamination_detected || runtime_overlap_detected ? 0.2 : 0.95).toFixed(3)
  );

  const isolation_safe = isolation_integrity_score >= 0.9 && !cross_tenant_leakage && !memory_contamination_detected;

  return {
    isolation_integrity_score,
    cross_tenant_leakage: cross_tenant_leakage === true,
    memory_contamination_detected: memory_contamination_detected === true,
    runtime_overlap_detected: runtime_overlap_detected === true,
    isolation_safe,
    tenant_id: tenantId,
    auto_mutation: false
  };
}

module.exports = { evaluateTenantCognitiveIsolation };
