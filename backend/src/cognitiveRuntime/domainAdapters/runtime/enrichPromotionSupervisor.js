'use strict';

const flagsZ21 = require('../../config/phaseZ21FeatureFlags');

function isQualityProfile(payload = {}, ctx = {}) {
  const pc = String(payload.profile_code || ctx.profile_code || '').toLowerCase();
  const axis = String(payload.functional_axis || payload.functional_area || ctx.domain_axis || '').toLowerCase();
  return pc.includes('quality') || axis === 'quality';
}

/**
 * Supervisão da promoção shadow → enrich — determinística, rollback-safe.
 */
function evaluatePromotionEligibility(user = {}, payload = {}, ctx = {}, qualityPilot = {}) {
  const mode = flagsZ21.specializedDeliveryMode();

  if (mode === 'off' && !ctx.force_specialized_enrich) {
    return { allowed: false, mode: 'off', reason: 'specialized_delivery_off' };
  }

  if (!isQualityProfile(payload, ctx)) {
    return { allowed: false, mode, reason: 'not_quality_profile' };
  }

  if (qualityPilot?.pilot_skipped) {
    return { allowed: false, mode, reason: qualityPilot.reason || 'pilot_skipped' };
  }

  const bindingRatio = qualityPilot?.engine_bridge?.binding_ratio ?? 0;
  const minRatio = flagsZ21.minBindingRatioForPromotion();
  if (bindingRatio < minRatio && mode === 'enrich' && !ctx.force_specialized_enrich) {
    return {
      allowed: false,
      mode,
      reason: 'insufficient_engine_binding',
      binding_ratio: bindingRatio,
      min_required: minRatio
    };
  }

  if (payload.governance_freeze_state?.mutation_after_lock_detected === true) {
    return { allowed: false, mode, reason: 'mutation_after_lock_detected' };
  }

  const enrichAllowed = mode === 'enrich' || ctx.force_specialized_enrich === true;
  const shadowCompare = mode === 'shadow' || flagsZ21.isSpecializedDeliveryShadowCompare();

  return {
    allowed: enrichAllowed || shadowCompare,
    enrich_payload: enrichAllowed,
    shadow_compare_only: shadowCompare && !enrichAllowed,
    mode: enrichAllowed ? 'enrich' : 'shadow',
    binding_ratio: bindingRatio,
    governance_locked: payload.governance_freeze_state?.governance_locked === true,
    terminal_safe: true,
    rollback_safe: true
  };
}

module.exports = {
  isQualityProfile,
  evaluatePromotionEligibility
};
