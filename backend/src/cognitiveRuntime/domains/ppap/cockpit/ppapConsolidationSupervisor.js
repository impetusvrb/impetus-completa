'use strict';

const flags = require('../../../config/phasePpapNativeFeatureFlags');
const { isPpapProfile } = require('../runtime/ppapRuntimeDescriptor');

/** Paridade Z.23 Quality/Logistics — threshold homologado, sem redução. */
const Z23_MIN_BINDING_RATIO = 0.35;

/**
 * GF-004 — Eligibility Z.23 ppap_native (consumidor passivo da cadeia Z.22).
 */
function evaluatePpapConsolidationEligibility(payload = {}, ctx = {}, ppapPilot = {}) {
  if (!flags.isPpapNativeCockpitPilot() && !ctx.force_ppap_consolidation) {
    return { allowed: false, reason: 'ppap_native_cockpit_off' };
  }
  if (!isPpapProfile(payload, ctx) && !ctx.force_ppap_consolidation) {
    return { allowed: false, reason: 'not_ppap_domain' };
  }
  if (ppapPilot?.pilot_skipped && !ctx.force_ppap_consolidation) {
    return { allowed: false, reason: ppapPilot.reason || 'pilot_skipped' };
  }
  const profile = String(payload.profile_code || ctx.profile_code || '');
  if (!flags.isPilotProfile(profile) && !ctx.force_ppap_consolidation) {
    return { allowed: false, reason: 'not_pilot_profile', profile_code: profile };
  }

  const ppapRenderApplied =
    payload.cognitive_render_promotion?.promotion_applied === true &&
    payload.cognitive_render_promotion?.cockpit_mode === 'ppap_native';
  const needsZ22 =
    ppapRenderApplied ||
    ctx.ppap_render_promoted === true ||
    ctx.force_ppap_consolidation === true ||
    ctx.force_ppap_render === true;
  if (!needsZ22) {
    return { allowed: false, reason: 'z22_render_promotion_required' };
  }

  const bindingRatio = ppapPilot?.engine_bridge?.binding_ratio ?? 0;
  if (bindingRatio < Z23_MIN_BINDING_RATIO) {
    return {
      allowed: false,
      reason: bindingRatio === 0 ? 'insufficient_binding_no_dataset' : 'insufficient_binding',
      binding_ratio: bindingRatio,
      min_required: Z23_MIN_BINDING_RATIO,
      bound_blocks: ppapPilot?.engine_bridge?.bound_blocks || [],
      missing_blocks: ppapPilot?.engine_bridge?.missing_blocks || []
    };
  }

  if (payload.governance_freeze_state?.mutation_after_lock_detected) {
    return { allowed: false, reason: 'mutation_after_lock' };
  }

  return {
    allowed: true,
    consolidate: true,
    shadow_only: flags.isPpapCognitiveRuntimeShadow() && !flags.isPpapNativeCockpitPilot(),
    binding_ratio: bindingRatio
  };
}

module.exports = { evaluatePpapConsolidationEligibility, Z23_MIN_BINDING_RATIO };
