'use strict';

const flagsPpap = require('../../config/phasePpapNativeFeatureFlags');
const flagsZ22 = require('../../config/phaseZ22FeatureFlags');
const { isPpapProfile } = require('../../domains/ppap/runtime/ppapRuntimeDescriptor');

/**
 * GF-004 — Eligibility Z.22 ppap_native (consumidor passivo do pilot Z.19).
 * Lê binding_ratio do engine_bridge; nunca consulta BD nem recalcula sinais.
 */
function evaluatePpapRenderPromotionEligibility(user = {}, payload = {}, ctx = {}, ppapPilot = {}) {
  if (!flagsPpap.isPpapRenderPromotionControlled() && !ctx.force_ppap_render) {
    return { allowed: false, reason: 'ppap_render_off' };
  }
  if (!isPpapProfile(payload, ctx) && !ctx.force_ppap_render) {
    return { allowed: false, reason: 'not_ppap_profile' };
  }
  if (ppapPilot?.pilot_skipped && !ctx.force_ppap_render) {
    return { allowed: false, reason: ppapPilot.reason || 'pilot_skipped' };
  }
  const profileCode = String(payload.profile_code || ctx.profile_code || '');
  if (!flagsPpap.isPilotProfile(profileCode) && !ctx.force_ppap_render) {
    return { allowed: false, reason: 'not_pilot_profile', profile_code: profileCode };
  }

  const bindingRatio = ppapPilot?.engine_bridge?.binding_ratio ?? 0;
  const minRatio = flagsZ22.minBindingRatioForRender();
  if (bindingRatio < minRatio) {
    return {
      allowed: false,
      reason: bindingRatio === 0 ? 'insufficient_binding_no_dataset' : 'insufficient_binding_for_render',
      binding_ratio: bindingRatio,
      min_required: minRatio,
      bound_blocks: ppapPilot?.engine_bridge?.bound_blocks || [],
      missing_blocks: ppapPilot?.engine_bridge?.missing_blocks || [],
      signal_readiness: ppapPilot?.engine_bridge?.signal_readiness || 'NO_DATASET'
    };
  }

  if (payload.governance_freeze_state?.mutation_after_lock_detected === true) {
    return { allowed: false, reason: 'mutation_after_lock_detected' };
  }

  return {
    allowed: true,
    promote_render: true,
    binding_ratio: bindingRatio,
    cockpit_mode: 'ppap_native',
    rollback_safe: true,
    global_replace: false
  };
}

module.exports = { evaluatePpapRenderPromotionEligibility };
