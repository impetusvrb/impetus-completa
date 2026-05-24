'use strict';

const c6 = require('../config/phaseC6FeatureFlags');

function establishCognitiveSovereignty(payload = {}, ctx = {}) {
  const promoted = payload.widgets_promoted?.length ?? 0;
  const legacy = payload.widgets_legacy?.length ?? 0;
  const v2Widgets = payload.engine_v2?.payload?.layout?.widgets?.length ?? 0;
  const runtimeZActive =
    !!(payload.cognitive_render_promotion?.promotion_applied ||
      payload.production_cognitive_runtime?.consolidation_applied ||
      payload.multi_domain_foundation);

  const motorADominant = legacy > promoted * 1.5 && !payload.cognitive_render_promotion?.promotion_applied;
  const v2Competing =
    v2Widgets > 0 &&
    c6.engineV2RetirementMode() === 'retired_shadow_reference' &&
    payload.cognitive_render_promotion?.promotion_applied !== true;

  const multi_runtime_conflict_detected = motorADominant || v2Competing;

  const authority_unification_score = Number(
    Math.max(
      0,
      Math.min(
        1,
        (runtimeZActive ? 0.45 : 0.1) +
          (payload.production_authority_runtime?.authority_mode === 'AUTHORITATIVE_CONTROLLED' ? 0.2 : 0) +
          (payload.runtime_integrity_runtime?.integrity_safe ? 0.15 : 0) +
          (promoted > legacy ? 0.15 : 0) +
          (!multi_runtime_conflict_detected ? 0.15 : 0)
      )
    ).toFixed(3)
  );

  const sovereignty_safe =
    runtimeZActive &&
    !motorADominant &&
    (!v2Competing || v2Widgets === 0) &&
    authority_unification_score >= 0.55;

  return {
    sovereign_runtime: c6.sovereignRuntimeId(),
    sovereign_mode: 'controlled_primary_authority',
    fallback_runtime: c6.fallbackRuntimeId(),
    engine_v2_status: c6.engineV2RetirementMode(),
    authority_unification_score,
    multi_runtime_conflict_detected,
    sovereignty_safe,
    rollback_ready: true,
    authoritative_global: false,
    auto_mutation: false,
    motor_a_removed: false,
    engine_v2_removed: false
  };
}

module.exports = { establishCognitiveSovereignty };
