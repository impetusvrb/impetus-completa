'use strict';

const flags = require('../../../config/phaseIshikawaNativeFeatureFlags');
const { isIshikawaProfile } = require('../runtime/ishikawaRuntimeDescriptor');
const { logIshikawaPromotion } = require('../../../renderPromotion/ishikawa/ishikawaPromotionLogger');

/** Paridade Z.23 Quality/Logistics/PPAP/MSA — threshold homologado. */
const Z23_MIN_BINDING_RATIO = 0.35;

/**
 * GF-018 — Eligibility Z.23 ishikawa_native (consumidor passivo da cadeia Z.22).
 */
function evaluateIshikawaConsolidationEligibility(payload = {}, ctx = {}, ishikawaPilot = {}) {
  if (!flags.isIshikawaNativeCockpitPilot() && !ctx.force_ishikawa_consolidation) {
    return { allowed: false, reason: 'ishikawa_native_cockpit_off' };
  }
  if (!isIshikawaProfile(payload, ctx) && !ctx.force_ishikawa_consolidation) {
    return { allowed: false, reason: 'not_ishikawa_domain' };
  }
  if (ishikawaPilot?.pilot_skipped && !ctx.force_ishikawa_consolidation) {
    return { allowed: false, reason: ishikawaPilot.reason || 'pilot_skipped' };
  }
  const profile = String(payload.profile_code || ctx.profile_code || '');
  if (!flags.isPilotProfile(profile) && !ctx.force_ishikawa_consolidation) {
    return { allowed: false, reason: 'not_pilot_profile', profile_code: profile };
  }

  const ishikawaRenderApplied =
    payload.cognitive_render_promotion?.promotion_applied === true &&
    payload.cognitive_render_promotion?.cockpit_mode === 'ishikawa_native';
  const needsZ22 =
    ishikawaRenderApplied ||
    ctx.ishikawa_render_promoted === true ||
    ctx.force_ishikawa_consolidation === true ||
    ctx.force_ishikawa_render === true;
  if (!needsZ22) {
    return { allowed: false, reason: 'z22_render_promotion_required' };
  }

  const bindingRatio = ishikawaPilot?.engine_bridge?.binding_ratio ?? 0;
  if (bindingRatio < Z23_MIN_BINDING_RATIO) {
    const reason = bindingRatio === 0 ? 'insufficient_binding_no_dataset' : 'INSUFFICIENT_BINDING';
    logIshikawaPromotion('Z23_BLOCKED', {
      binding_ratio: bindingRatio,
      min_required: Z23_MIN_BINDING_RATIO,
      reason,
      gate_scenario: bindingRatio === 0 ? 'A_NO_DATASET' : 'B_BELOW_THRESHOLD'
    });
    return {
      allowed: false,
      reason,
      binding_ratio: bindingRatio,
      min_required: Z23_MIN_BINDING_RATIO,
      bound_blocks: ishikawaPilot?.engine_bridge?.bound_blocks || [],
      missing_blocks: ishikawaPilot?.engine_bridge?.missing_blocks || []
    };
  }

  if (payload.governance_freeze_state?.mutation_after_lock_detected) {
    return { allowed: false, reason: 'mutation_after_lock' };
  }

  logIshikawaPromotion('Z23_ALLOWED', {
    binding_ratio: bindingRatio,
    min_required: Z23_MIN_BINDING_RATIO,
    gate_scenario: 'C_GATE_PASS'
  });

  return {
    allowed: true,
    consolidate: true,
    shadow_only: flags.isIshikawaCognitiveRuntimeShadow() && !flags.isIshikawaNativeCockpitPilot(),
    binding_ratio: bindingRatio
  };
}

module.exports = { evaluateIshikawaConsolidationEligibility, Z23_MIN_BINDING_RATIO };
