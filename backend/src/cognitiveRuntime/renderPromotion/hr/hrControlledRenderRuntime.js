'use strict';

const flagsZ26 = require('../../config/phaseZ26FeatureFlags');
const { resolvePromotedHrWidgetsFromShadow } = require('./hrWidgetPromotionResolver');
const { buildHrSuppressionPlan } = require('./hrWidgetSuppression');
const { sanitizePromotedWidgets } = require('../runtime/cognitiveRenderSafety');
const { emitHrCockpitTelemetry } = require('../../domains/hr/observability/hrCockpitTelemetry');

function isHrProfile(payload = {}, ctx = {}) {
  const pc = String(payload.profile_code || ctx.profile_code || '').toLowerCase();
  const axis = String(payload.functional_axis || payload.functional_area || '').toLowerCase();
  return flagsZ26.isPilotProfile(pc) || axis === 'hr' || axis === 'rh' || pc === 'hr_management';
}

function runHrRenderPromotion(shadow = {}, payload = {}, hrPilot = {}, opts = {}) {
  const widgets = resolvePromotedHrWidgetsFromShadow(shadow, { max_widgets: opts.max_promoted_widgets ?? 8 });
  const legacy =
    payload.widgets_legacy || payload.profile_config?.widgets || payload.engine_v2?.payload?.layout?.widgets || [];
  const suppression = buildHrSuppressionPlan(legacy, { max_suppressed: opts.max_generic_suppressed ?? 6 });
  return { widgets, widgets_promoted: widgets, suppression, promotion_applied: widgets.length > 0, render_active: true, phase: 'Z.26', cockpit_mode: 'hr_native' };
}

function applyHrControlledRenderPromotion(user = {}, payload = {}, ctx = {}, hrPilot = {}) {
  if (!flagsZ26.isHrRenderPromotionControlled() && !ctx.force_hr_render) {
    return { payload, skipped: true, reason: 'hr_render_off' };
  }
  if (!isHrProfile(payload, ctx)) return { payload, skipped: true, reason: 'not_hr_profile' };
  if (hrPilot?.pilot_skipped) return { payload, skipped: true, reason: hrPilot.reason };

  const promotion = runHrRenderPromotion(hrPilot.shadow_cognitive_cockpit || {}, payload, hrPilot, ctx);
  const widgets = sanitizePromotedWidgets(promotion.widgets);
  const enriched = {
    ...payload,
    widgets_promoted: widgets,
    widgets_legacy: payload.widgets_legacy || payload.profile_config?.widgets,
    cognitive_render_promotion: {
      phase: 'Z.26',
      promotion_applied: true,
      render_active: true,
      cockpit_mode: 'hr_native',
      suppression: promotion.suppression,
      global_replace: false
    }
  };

  emitHrCockpitTelemetry('HR_RENDER_PROMOTED', { tenant_id: user?.company_id, widgets: widgets.length });
  return { payload: enriched, ok: true, cognitive_render_promotion: enriched.cognitive_render_promotion };
}

module.exports = { applyHrControlledRenderPromotion, isHrProfile, runHrRenderPromotion };
