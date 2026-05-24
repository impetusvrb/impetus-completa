'use strict';

function analyzeQualityFallbackPressure(payload = {}, authority = {}) {
  const promoted = payload.widgets_promoted?.length ?? 0;
  const legacy = payload.widgets_legacy?.length ?? payload.profile_config?.widgets?.length ?? 0;
  const v2 = payload.engine_v2?.payload?.layout?.widgets?.length ?? 0;
  const motorKpis = payload.kpis_legacy?.length ?? 0;
  const zKpis = payload.kpis_specialized?.length ?? 0;

  const totalDelivery = promoted + legacy + v2 + 1;
  const fallback_dominance_ratio = Number(((legacy + motorKpis) / totalDelivery).toFixed(3));
  const v2_residual_ratio = Number((v2 / totalDelivery).toFixed(3));
  const runtime_z_effective_ratio = Number(
    Math.min(1, (promoted + zKpis + (authority.runtime_authority_score || 0)) / (totalDelivery * 0.5)).toFixed(3)
  );

  const hidden_legacy_delivery =
    legacy > 0 && payload.cognitive_render_promotion?.promotion_applied && authority.authority_mode === 'AUTHORITATIVE_CONTROLLED';

  const shadow_masking =
    payload.cognitive_runtime_report?.phase_stack?.includes('shadow') && legacy > promoted;

  let convergence_pressure = 'low';
  if (fallback_dominance_ratio > 0.45 || hidden_legacy_delivery) convergence_pressure = 'high';
  else if (fallback_dominance_ratio > 0.25 || v2_residual_ratio > 0.2) convergence_pressure = 'medium';

  return {
    fallback_dominance_ratio,
    v2_residual_ratio,
    runtime_z_effective_ratio,
    hidden_legacy_delivery,
    shadow_masking,
    convergence_pressure
  };
}

module.exports = { analyzeQualityFallbackPressure };
