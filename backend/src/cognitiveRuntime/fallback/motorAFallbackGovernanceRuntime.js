'use strict';

const c6 = require('../config/phaseC6FeatureFlags');

function governMotorAFallback(payload = {}) {
  const legacy = payload.widgets_legacy?.length ?? 0;
  const promoted = payload.widgets_promoted?.length ?? 0;
  const kpisLegacy = payload.kpis_legacy?.length ?? 0;
  const total = legacy + promoted + kpisLegacy;

  const fallback_authority_ratio = Number((legacy / Math.max(total, 1)).toFixed(3));

  const dominant_delivery_detected =
    legacy > promoted * 1.2 && !payload.cognitive_render_promotion?.promotion_applied;

  const degradation_support_active =
    legacy > 0 || kpisLegacy > 0 || payload.profile_config?.widgets?.length > 0;

  return {
    motor_a_mode: 'supervised_fallback',
    fallback_authority_ratio,
    degradation_support_active,
    rollback_runtime_ready: payload.production_authority_runtime?.rollback_ready !== false,
    dominant_delivery_detected,
    motor_a_removed: false,
    resilience_layer_active: degradation_support_active,
    auto_mutation: false,
    fallback_runtime_id: c6.fallbackRuntimeId()
  };
}

module.exports = { governMotorAFallback };
