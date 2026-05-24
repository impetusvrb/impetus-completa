'use strict';

function validateAuthorityConsistency(payload = {}) {
  const prodAuth = payload.production_authority_runtime;
  const qualityAuth = payload.quality_authority_runtime;
  const c4 = payload.cognitive_c4_summary;
  const c1 = payload.cognitive_authority_runtime;
  const promoted = payload.widgets_promoted?.length ?? 0;
  const legacy = payload.widgets_legacy?.length ?? 0;

  const hidden_fallback_detected = legacy > promoted && payload.cognitive_render_promotion?.promotion_applied;
  const frontend_authority_drift =
    (payload.production_frontend_convergence?.convergence_safe === false && prodAuth?.authority_mode === 'AUTHORITATIVE_CONTROLLED') ||
    (c1?.frontend_runtime_alignment < 0.6 && prodAuth?.authority_mode === 'AUTHORITATIVE_CONTROLLED');

  const runtime_masking_detected =
    payload.production_delivery_certification?.leakage?.fallback_leakage_detected === true ||
    payload.production_delivery_certification?.leakage?.shadow_masking_detected === true;

  const authority_contradiction =
    prodAuth?.authority_mode === 'AUTHORITATIVE_CONTROLLED' &&
    qualityAuth?.authority_mode === 'AUTHORITATIVE_CONTROLLED' &&
    c4?.authority_mode !== prodAuth?.authority_mode;

  const authority_consistent =
    !hidden_fallback_detected && !frontend_authority_drift && !runtime_masking_detected && !authority_contradiction;

  const authority_integrity_score = Number(
    Math.max(
      0,
      Math.min(
        1,
        (authority_consistent ? 0.6 : 0.2) +
          (prodAuth?.rollback_ready ? 0.15 : 0) +
          (c4?.certification_safe ? 0.15 : 0) +
          (1 - (prodAuth?.fallback_usage_ratio ?? 0.5)) * 0.1
      )
    ).toFixed(3)
  );

  return {
    authority_consistent,
    hidden_fallback_detected,
    frontend_authority_drift,
    runtime_masking_detected,
    authority_integrity_score
  };
}

module.exports = { validateAuthorityConsistency };
