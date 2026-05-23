'use strict';

const flagsZ25 = require('../../config/phaseZ25FeatureFlags');
const { runSafetyRenderPromotion } = require('./safetyRenderPromotionEngine');
const { sanitizePromotedWidgets } = require('../runtime/cognitiveRenderSafety');
const { emitSafetyCockpitTelemetry } = require('../../domains/sst/observability/safetyCockpitTelemetry');

function isSafetyProfile(payload = {}, ctx = {}) {
  const pc = String(payload.profile_code || ctx.profile_code || '').toLowerCase();
  const axis = String(payload.functional_axis || payload.functional_area || '').toLowerCase();
  return flagsZ25.isPilotProfile(pc) || axis === 'safety' || pc.includes('safety');
}

function applySafetyControlledRenderPromotion(user = {}, payload = {}, ctx = {}, safetyPilot = {}) {
  if (!flagsZ25.isSafetyRenderPromotionControlled() && !ctx.force_safety_render) {
    return { payload, skipped: true, reason: 'safety_render_off' };
  }
  if (!isSafetyProfile(payload, ctx)) {
    return { payload, skipped: true, reason: 'not_safety_profile' };
  }
  if (safetyPilot?.pilot_skipped) {
    return { payload, skipped: true, reason: safetyPilot.reason };
  }

  const shadow = safetyPilot.shadow_cognitive_cockpit || {};
  const promotion = runSafetyRenderPromotion(shadow, payload, safetyPilot, ctx);
  const widgets = sanitizePromotedWidgets(promotion.widgets);

  const enriched = {
    ...payload,
    widgets_promoted: widgets,
    widgets_legacy: payload.widgets_legacy || payload.profile_config?.widgets,
    cognitive_render_promotion: {
      phase: 'Z.25',
      promotion_applied: true,
      render_active: true,
      cockpit_mode: 'safety_native',
      suppression: promotion.suppression,
      global_replace: false
    }
  };

  emitSafetyCockpitTelemetry('SAFETY_RENDER_PROMOTED', {
    tenant_id: user?.company_id,
    widgets: widgets.length
  });

  return { payload: enriched, ok: true, cognitive_render_promotion: enriched.cognitive_render_promotion };
}

module.exports = { applySafetyControlledRenderPromotion, isSafetyProfile };
