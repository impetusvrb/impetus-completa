'use strict';

const flagsLogistics = require('../../config/phaseLogisticsNativeFeatureFlags');
const flagsZ22 = require('../../config/phaseZ22FeatureFlags');
const { isLogisticsProfile } = require('../../domains/logistics/runtime/logisticsRuntimeDescriptor');

/**
 * INC-041 — Eligibility Z.22 logistics (consumidor passivo).
 * Lê binding_ratio do pilot Z.19; thresholds via flags Z.22 existentes.
 */
function evaluateLogisticsRenderPromotionEligibility(user = {}, payload = {}, ctx = {}, logisticsPilot = {}) {
  if (!flagsLogistics.isLogisticsRenderPromotionControlled() && !ctx.force_logistics_render) {
    return { allowed: false, reason: 'logistics_render_off' };
  }
  if (!isLogisticsProfile(payload, ctx) && !ctx.force_logistics_render) {
    return { allowed: false, reason: 'not_logistics_profile' };
  }
  if (logisticsPilot?.pilot_skipped && !ctx.force_logistics_render) {
    return { allowed: false, reason: logisticsPilot.reason || 'pilot_skipped' };
  }
  const profileCode = String(payload.profile_code || ctx.profile_code || '');
  if (!flagsLogistics.isPilotProfile(profileCode) && !ctx.force_logistics_render) {
    return { allowed: false, reason: 'not_pilot_profile', profile_code: profileCode };
  }

  const bindingRatio = logisticsPilot?.engine_bridge?.binding_ratio ?? 0;
  const minRatio = flagsZ22.minBindingRatioForRender();
  if (bindingRatio < minRatio && !ctx.force_logistics_render) {
    return {
      allowed: false,
      reason: 'insufficient_binding_for_render',
      binding_ratio: bindingRatio,
      min_required: minRatio
    };
  }

  if (payload.governance_freeze_state?.mutation_after_lock_detected === true) {
    return { allowed: false, reason: 'mutation_after_lock_detected' };
  }

  return {
    allowed: true,
    promote_render: true,
    binding_ratio: bindingRatio,
    cockpit_mode: 'logistics_native',
    rollback_safe: true,
    global_replace: false
  };
}

module.exports = { evaluateLogisticsRenderPromotionEligibility };
