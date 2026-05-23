'use strict';

const flagsZP0 = require('../../config/phaseZP0FeatureFlags');
const { resolvePromotedProductionWidgetsFromShadow } = require('./productionWidgetPromotionResolver');
const { buildProductionSuppressionPlan } = require('./productionWidgetSuppression');
const { sanitizePromotedWidgets } = require('../runtime/cognitiveRenderSafety');

function isProductionProfile(payload = {}, ctx = {}) {
  const pc = String(payload.profile_code || ctx.profile_code || '').toLowerCase();
  const axis = String(payload.functional_axis || payload.functional_area || '').toLowerCase();
  return flagsZP0.isPilotProfile(pc) || axis === 'production' || axis === 'producao' || pc.includes('pcp');
}

function runProductionRenderPromotion(shadow = {}, payload = {}, productionPilot = {}, opts = {}) {
  const widgets = resolvePromotedProductionWidgetsFromShadow(shadow, { max_widgets: opts.max_promoted_widgets ?? 8 });
  const legacy =
    payload.widgets_legacy || payload.profile_config?.widgets || payload.engine_v2?.payload?.layout?.widgets || [];
  const suppression = buildProductionSuppressionPlan(legacy, { max_suppressed: opts.max_generic_suppressed ?? 8 });
  return {
    widgets,
    widgets_promoted: widgets,
    suppression,
    promotion_applied: widgets.length > 0,
    render_active: true,
    phase: 'Z.P0',
    cockpit_mode: 'production_native'
  };
}

function applyProductionControlledRenderPromotion(user = {}, payload = {}, ctx = {}, productionPilot = {}) {
  if (!flagsZP0.isProductionRenderPromotionControlled() && !ctx.force_production_render) {
    return { payload, skipped: true, reason: 'production_render_off' };
  }
  if (!isProductionProfile(payload, ctx)) return { payload, skipped: true, reason: 'not_production_profile' };
  if (productionPilot?.pilot_skipped) return { payload, skipped: true, reason: productionPilot.reason };

  const promotion = runProductionRenderPromotion(
    productionPilot.shadow_cognitive_cockpit || {},
    payload,
    productionPilot,
    ctx
  );
  const widgets = sanitizePromotedWidgets(promotion.widgets);
  const enriched = {
    ...payload,
    widgets_promoted: widgets,
    widgets_legacy: payload.widgets_legacy || payload.profile_config?.widgets,
    cognitive_render_promotion: {
      phase: 'Z.P0',
      promotion_applied: true,
      render_active: true,
      cockpit_mode: 'production_native',
      suppression: promotion.suppression,
      global_replace: false
    }
  };
  return { payload: enriched, ok: true, cognitive_render_promotion: enriched.cognitive_render_promotion };
}

module.exports = {
  applyProductionControlledRenderPromotion,
  isProductionProfile,
  runProductionRenderPromotion
};
