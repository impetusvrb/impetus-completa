'use strict';

function enforceFallbackVisibility(payload = {}, motorA = {}) {
  const legacy = payload.widgets_legacy?.length ?? 0;
  const promoted = payload.widgets_promoted?.length ?? 0;

  const hidden_fallback_detected =
    legacy > promoted && payload.cognitive_render_promotion?.promotion_applied && motorA.dominant_delivery_detected;

  const masked_delivery_detected =
    payload.production_delivery_certification?.leakage?.fallback_leakage_detected === true ||
    payload.production_delivery_certification?.leakage?.shadow_masking_detected === true ||
    payload.runtime_integrity_runtime?.integrity_alerts?.includes('hidden_fallback');

  const visible_fallback_integrity =
    !hidden_fallback_detected &&
    !masked_delivery_detected &&
    (motorA.motor_a_mode === 'supervised_fallback' || legacy === 0);

  const fallback_transparency_score = Number(
    Math.max(
      0,
      Math.min(
        1,
        (visible_fallback_integrity ? 0.55 : 0.15) +
          (motorA.degradation_support_active ? 0.2 : 0) +
          (!hidden_fallback_detected ? 0.15 : 0) +
          (!masked_delivery_detected ? 0.1 : 0)
      )
    ).toFixed(3)
  );

  return {
    visible_fallback_integrity,
    hidden_fallback_detected,
    masked_delivery_detected,
    fallback_transparency_score,
    enforcement_executed: false,
    advisory_only: true
  };
}

module.exports = { enforceFallbackVisibility };
