'use strict';

const flags = require('../../../config/phaseMsaNativeFeatureFlags');
const { isMsaProfile } = require('../runtime/msaRuntimeDescriptor');

/** Paridade Z.23 Quality/Logistics/PPAP — threshold homologado, sem redução. */
const Z23_MIN_BINDING_RATIO = 0.35;

/**
 * GF-011 — Eligibility Z.23 msa_native (consumidor passivo da cadeia Z.22).
 */
function evaluateMsaConsolidationEligibility(payload = {}, ctx = {}, msaPilot = {}) {
  if (!flags.isMsaNativeCockpitPilot() && !ctx.force_msa_consolidation) {
    return { allowed: false, reason: 'msa_native_cockpit_off' };
  }
  if (!isMsaProfile(payload, ctx) && !ctx.force_msa_consolidation) {
    return { allowed: false, reason: 'not_msa_domain' };
  }
  if (msaPilot?.pilot_skipped && !ctx.force_msa_consolidation) {
    return { allowed: false, reason: msaPilot.reason || 'pilot_skipped' };
  }
  const profile = String(payload.profile_code || ctx.profile_code || '');
  if (!flags.isPilotProfile(profile) && !ctx.force_msa_consolidation) {
    return { allowed: false, reason: 'not_pilot_profile', profile_code: profile };
  }

  const msaRenderApplied =
    payload.cognitive_render_promotion?.promotion_applied === true &&
    payload.cognitive_render_promotion?.cockpit_mode === 'msa_native';
  const needsZ22 =
    msaRenderApplied ||
    ctx.msa_render_promoted === true ||
    ctx.force_msa_consolidation === true ||
    ctx.force_msa_render === true;
  if (!needsZ22) {
    return { allowed: false, reason: 'z22_render_promotion_required' };
  }

  const bindingRatio = msaPilot?.engine_bridge?.binding_ratio ?? 0;
  if (bindingRatio < Z23_MIN_BINDING_RATIO) {
    return {
      allowed: false,
      reason: bindingRatio === 0 ? 'insufficient_binding_no_dataset' : 'insufficient_binding',
      binding_ratio: bindingRatio,
      min_required: Z23_MIN_BINDING_RATIO,
      bound_blocks: msaPilot?.engine_bridge?.bound_blocks || [],
      missing_blocks: msaPilot?.engine_bridge?.missing_blocks || []
    };
  }

  if (payload.governance_freeze_state?.mutation_after_lock_detected) {
    return { allowed: false, reason: 'mutation_after_lock' };
  }

  return {
    allowed: true,
    consolidate: true,
    shadow_only: flags.isMsaCognitiveRuntimeShadow() && !flags.isMsaNativeCockpitPilot(),
    binding_ratio: bindingRatio
  };
}

module.exports = { evaluateMsaConsolidationEligibility, Z23_MIN_BINDING_RATIO };
