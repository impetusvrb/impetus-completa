'use strict';

const flagsIshikawa = require('../../config/phaseIshikawaNativeFeatureFlags');
const flagsZ22 = require('../../config/phaseZ22FeatureFlags');
const { isIshikawaProfile } = require('../../domains/ishikawa/runtime/ishikawaRuntimeDescriptor');
const { logIshikawaPromotion } = require('./ishikawaPromotionLogger');

/**
 * GF-018 — Eligibility Z.22 ishikawa_native (consumidor passivo do pilot Z.19).
 * Lê binding_ratio do engine_bridge; nunca consulta BD nem recalcula sinais.
 */
function evaluateIshikawaRenderPromotionEligibility(user = {}, payload = {}, ctx = {}, ishikawaPilot = {}) {
  if (!flagsIshikawa.isIshikawaRenderPromotionControlled() && !ctx.force_ishikawa_render) {
    return { allowed: false, reason: 'ishikawa_render_off' };
  }
  if (!isIshikawaProfile(payload, ctx) && !ctx.force_ishikawa_render) {
    return { allowed: false, reason: 'not_ishikawa_profile' };
  }
  if (ishikawaPilot?.pilot_skipped && !ctx.force_ishikawa_render) {
    return { allowed: false, reason: ishikawaPilot.reason || 'pilot_skipped' };
  }
  const profileCode = String(payload.profile_code || ctx.profile_code || '');
  if (!flagsIshikawa.isPilotProfile(profileCode) && !ctx.force_ishikawa_render) {
    return { allowed: false, reason: 'not_pilot_profile', profile_code: profileCode };
  }

  const bindingRatio = ishikawaPilot?.engine_bridge?.binding_ratio ?? 0;
  const minRatio = flagsZ22.minBindingRatioForRender();
  if (bindingRatio < minRatio) {
    const reason = bindingRatio === 0 ? 'insufficient_binding_no_dataset' : 'INSUFFICIENT_BINDING';
    logIshikawaPromotion('Z22_BLOCKED', {
      binding_ratio: bindingRatio,
      min_required: minRatio,
      reason,
      gate_scenario: bindingRatio === 0 ? 'A_NO_DATASET' : 'B_BELOW_THRESHOLD'
    });
    return {
      allowed: false,
      reason,
      binding_ratio: bindingRatio,
      min_required: minRatio,
      bound_blocks: ishikawaPilot?.engine_bridge?.bound_blocks || [],
      missing_blocks: ishikawaPilot?.engine_bridge?.missing_blocks || [],
      signal_readiness: ishikawaPilot?.engine_bridge?.signal_readiness || 'NO_DATASET'
    };
  }

  if (payload.governance_freeze_state?.mutation_after_lock_detected === true) {
    return { allowed: false, reason: 'mutation_after_lock_detected' };
  }

  logIshikawaPromotion('Z22_ALLOWED', {
    binding_ratio: bindingRatio,
    min_required: minRatio,
    gate_scenario: 'C_GATE_PASS'
  });

  return {
    allowed: true,
    promote_render: true,
    binding_ratio: bindingRatio,
    cockpit_mode: 'ishikawa_native',
    rollback_safe: true,
    global_replace: false
  };
}

module.exports = { evaluateIshikawaRenderPromotionEligibility };
