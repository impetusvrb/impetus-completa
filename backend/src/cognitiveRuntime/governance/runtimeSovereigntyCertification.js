'use strict';

function certifyRuntimeSovereignty(sovereignty = {}, unifier = {}, v2Retirement = {}, motorA = {}, frontend = {}, governance = {}) {
  const sovereignty_certified =
    sovereignty.sovereign_runtime === 'runtime_z' &&
    sovereignty.sovereignty_safe === true &&
    sovereignty.authoritative_global !== true;

  const runtime_unification_certified =
    unifier.authority_integrity >= 0.6 && !unifier.runtime_competition_detected;

  const frontend_certified = frontend.frontend_enforcement_safe === true && frontend.frontend_obeys_runtime_z === true;

  const fallback_governed =
    motorA.motor_a_mode === 'supervised_fallback' && !motorA.dominant_delivery_detected;

  const v2_retired = v2Retirement.engine_v2_runtime_mode === 'retired_shadow_reference' && v2Retirement.retirement_safe;

  const certification_confidence = Number(
    Math.max(
      0,
      Math.min(
        1,
        (sovereignty_certified ? 0.25 : 0) +
          (runtime_unification_certified ? 0.2 : 0) +
          (frontend_certified ? 0.2 : 0) +
          (fallback_governed ? 0.2 : 0) +
          (v2_retired ? 0.15 : 0)
      )
    ).toFixed(3)
  );

  return {
    sovereignty_certified,
    runtime_unification_certified,
    frontend_certified,
    fallback_governed,
    v2_retired,
    certification_confidence,
    certification_safe: certification_confidence >= 0.7,
    rollback_available: true,
    auto_mutation: false
  };
}

module.exports = { certifyRuntimeSovereignty };
