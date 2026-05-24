'use strict';

const flags = require('../config/phaseSZ1FeatureFlags');
const { incrementBlankScreenPrevented } = require('../observability/zSovereignObservability');
const { buildSovereignFallback } = require('../fallback/zFallbackRuntime');

/**
 * zResilienceRuntime — última linha de defesa antes do frontend.
 * Garante que NUNCA é devolvido um payload sem widgets / sem perfil /
 * sem sections quando o utilizador tem permissões válidas.
 */
function ensureContinuity(user = {}, payload = {}, ctx = {}) {
  if (!flags.isResilienceRuntimeEnabled()) {
    return { payload, runtime_skipped: true };
  }

  const checks = {
    has_profile: !!payload.profile_code,
    has_modules: Array.isArray(payload.visible_modules) && payload.visible_modules.length > 0,
    has_sections: Array.isArray(payload.sections) && payload.sections.length > 0,
    has_widgets:
      (Array.isArray(payload.widgets_promoted) && payload.widgets_promoted.length > 0) ||
      (Array.isArray(payload.widgets_legacy) && payload.widgets_legacy.length > 0) ||
      !!payload.personalization?.layout?.length ||
      !!payload.engine_v2?.payload?.layout?.widgets?.length
  };

  const blankScreenRisk = !checks.has_widgets && !checks.has_modules;

  let recoveredPayload = payload;
  if (blankScreenRisk) {
    const fb = buildSovereignFallback(user, payload, ctx);
    if (fb?.fallback?.widgets?.length) {
      recoveredPayload = {
        ...payload,
        z_fallback_layout: fb.fallback
      };
      incrementBlankScreenPrevented();
    }
  }

  const continuity_score = Number(
    Math.max(
      0,
      Math.min(
        1,
        (checks.has_profile ? 0.25 : 0) +
          (checks.has_modules ? 0.25 : 0) +
          (checks.has_sections ? 0.25 : 0) +
          (checks.has_widgets || recoveredPayload.z_fallback_layout ? 0.25 : 0)
      )
    ).toFixed(3)
  );

  return {
    payload: recoveredPayload,
    runtime: 'runtime_z',
    source: 'z_resilience_runtime',
    continuity_score,
    blank_screen_prevented: blankScreenRisk && !!recoveredPayload.z_fallback_layout,
    checks,
    auto_mutation: false
  };
}

module.exports = { ensureContinuity };
