'use strict';

const flagsMsa = require('../../config/phaseMsaNativeFeatureFlags');
const flagsZ22 = require('../../config/phaseZ22FeatureFlags');
const { isMsaProfile } = require('../../domains/msa/runtime/msaRuntimeDescriptor');

/**
 * GF-011 — Eligibility Z.22 msa_native (consumidor passivo do pilot Z.19).
 * Lê binding_ratio do engine_bridge; nunca consulta BD nem recalcula sinais.
 */
function evaluateMsaRenderPromotionEligibility(user = {}, payload = {}, ctx = {}, msaPilot = {}) {
  if (!flagsMsa.isMsaRenderPromotionControlled() && !ctx.force_msa_render) {
    return { allowed: false, reason: 'msa_render_off' };
  }
  if (!isMsaProfile(payload, ctx) && !ctx.force_msa_render) {
    return { allowed: false, reason: 'not_msa_profile' };
  }
  if (msaPilot?.pilot_skipped && !ctx.force_msa_render) {
    return { allowed: false, reason: msaPilot.reason || 'pilot_skipped' };
  }
  const profileCode = String(payload.profile_code || ctx.profile_code || '');
  if (!flagsMsa.isPilotProfile(profileCode) && !ctx.force_msa_render) {
    return { allowed: false, reason: 'not_pilot_profile', profile_code: profileCode };
  }

  const bindingRatio = msaPilot?.engine_bridge?.binding_ratio ?? 0;
  const minRatio = flagsZ22.minBindingRatioForRender();
  if (bindingRatio < minRatio) {
    return {
      allowed: false,
      reason: bindingRatio === 0 ? 'insufficient_binding_no_dataset' : 'insufficient_binding_for_render',
      binding_ratio: bindingRatio,
      min_required: minRatio,
      bound_blocks: msaPilot?.engine_bridge?.bound_blocks || [],
      missing_blocks: msaPilot?.engine_bridge?.missing_blocks || [],
      signal_readiness: msaPilot?.engine_bridge?.signal_readiness || 'NO_DATASET'
    };
  }

  if (payload.governance_freeze_state?.mutation_after_lock_detected === true) {
    return { allowed: false, reason: 'mutation_after_lock_detected' };
  }

  return {
    allowed: true,
    promote_render: true,
    binding_ratio: bindingRatio,
    cockpit_mode: 'msa_native',
    rollback_safe: true,
    global_replace: false
  };
}

module.exports = { evaluateMsaRenderPromotionEligibility };
