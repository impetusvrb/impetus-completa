'use strict';

const flags = require('../../../config/phaseLogisticsNativeFeatureFlags');
const { isLogisticsProfile } = require('../runtime/logisticsRuntimeDescriptor');

/** Paridade Z.23 Quality — valor existente, não alterado nesta INC. */
const Z23_MIN_BINDING_RATIO = 0.35;

/**
 * INC-041 — Eligibility Z.23 logistics (consumidor passivo da cadeia Z.22).
 */
function evaluateLogisticsConsolidationEligibility(payload = {}, ctx = {}, logisticsPilot = {}) {
  if (!flags.isLogisticsNativeCockpitPilot() && !ctx.force_logistics_consolidation) {
    return { allowed: false, reason: 'logistics_native_cockpit_off' };
  }
  if (!isLogisticsProfile(payload, ctx) && !ctx.force_logistics_consolidation) {
    return { allowed: false, reason: 'not_logistics_domain' };
  }
  if (logisticsPilot?.pilot_skipped && !ctx.force_logistics_consolidation) {
    return { allowed: false, reason: logisticsPilot.reason || 'pilot_skipped' };
  }
  const profile = String(payload.profile_code || ctx.profile_code || '');
  if (!flags.isPilotProfile(profile) && !ctx.force_logistics_consolidation) {
    return { allowed: false, reason: 'not_pilot_profile', profile_code: profile };
  }

  const needsZ22 =
    payload.cognitive_render_promotion?.promotion_applied === true ||
    ctx.logistics_render_promoted === true ||
    ctx.force_logistics_consolidation === true ||
    ctx.force_logistics_render === true;
  if (!needsZ22) {
    return { allowed: false, reason: 'z22_render_promotion_required' };
  }

  const bindingRatio = logisticsPilot?.engine_bridge?.binding_ratio ?? 0;
  if (bindingRatio < Z23_MIN_BINDING_RATIO && !ctx.force_logistics_consolidation) {
    return { allowed: false, reason: 'insufficient_binding', binding_ratio: bindingRatio };
  }

  if (payload.governance_freeze_state?.mutation_after_lock_detected) {
    return { allowed: false, reason: 'mutation_after_lock' };
  }

  return {
    allowed: true,
    consolidate: true,
    shadow_only: flags.isLogisticsCognitiveRuntimeShadow() && !flags.isLogisticsNativeCockpitPilot(),
    binding_ratio: bindingRatio
  };
}

module.exports = { evaluateLogisticsConsolidationEligibility, Z23_MIN_BINDING_RATIO };
