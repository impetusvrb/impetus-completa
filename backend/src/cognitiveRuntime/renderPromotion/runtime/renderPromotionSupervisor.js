'use strict';

const flagsZ22 = require('../../config/phaseZ22FeatureFlags');
const flagsZ21 = require('../../config/phaseZ21FeatureFlags');
const { isQualityProfile } = require('../../domainAdapters/runtime/enrichPromotionSupervisor');

function evaluateRenderPromotionEligibility(user = {}, payload = {}, ctx = {}, qualityPilot = {}) {
  const mode = flagsZ22.renderPromotionMode();

  if (mode === 'off' && !ctx.force_render_promotion) {
    return { allowed: false, mode: 'off', reason: 'render_promotion_off' };
  }

  if (!flagsZ22.isQualityRenderPromotionPilot()) {
    return { allowed: false, mode, reason: 'quality_render_pilot_off' };
  }

  const profileCode = String(payload.profile_code || ctx.profile_code || '');
  if (!flagsZ22.isPilotProfile(profileCode) && !ctx.force_render_promotion) {
    return { allowed: false, mode, reason: 'not_pilot_profile', profile_code: profileCode };
  }

  if (!isQualityProfile(payload, ctx)) {
    return { allowed: false, mode, reason: 'not_quality_domain' };
  }

  if (qualityPilot?.pilot_skipped) {
    return { allowed: false, mode, reason: qualityPilot.reason || 'pilot_skipped' };
  }

  const bindingRatio = qualityPilot?.engine_bridge?.binding_ratio ?? 0;
  const minRatio = flagsZ22.minBindingRatioForRender();
  if (bindingRatio < minRatio && mode === 'controlled' && !ctx.force_render_promotion) {
    return {
      allowed: false,
      mode,
      reason: 'insufficient_binding_for_render',
      binding_ratio: bindingRatio,
      min_required: minRatio
    };
  }

  if (payload.governance_freeze_state?.mutation_after_lock_detected === true) {
    return { allowed: false, mode, reason: 'mutation_after_lock_detected' };
  }

  const z21Enrich =
    flagsZ21.isSpecializedDeliveryEnrichActive() ||
    payload.specialized_delivery?.promotion_applied === true ||
    ctx.z21_enriched === true;

  if (!z21Enrich && mode === 'controlled' && !ctx.force_render_promotion) {
    return { allowed: false, mode, reason: 'z21_enrich_required_first' };
  }

  const controlled = mode === 'controlled' || mode === 'pilot' || ctx.force_render_promotion === true;
  const shadowCompare = mode === 'shadow' || flagsZ22.isRenderPromotionShadowCompare();

  return {
    allowed: controlled || shadowCompare,
    promote_render: controlled,
    shadow_compare_only: shadowCompare && !controlled,
    mode: controlled ? 'controlled' : 'shadow',
    binding_ratio: bindingRatio,
    pilot_profile: profileCode,
    rollback_safe: true,
    global_replace: false
  };
}

module.exports = { evaluateRenderPromotionEligibility };
