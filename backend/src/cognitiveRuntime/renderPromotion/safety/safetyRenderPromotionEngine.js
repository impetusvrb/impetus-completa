'use strict';

const { resolvePromotedSafetyWidgetsFromShadow } = require('./safetyWidgetPromotionResolver');
const { buildSafetySuppressionPlan } = require('./safetyWidgetSuppression');

function runSafetyRenderPromotion(shadow = {}, payload = {}, safetyPilot = {}, opts = {}) {
  const widgets = resolvePromotedSafetyWidgetsFromShadow(shadow, {
    max_widgets: opts.max_promoted_widgets ?? 8
  });
  const legacy =
    payload.widgets_legacy ||
    payload.profile_config?.widgets ||
    payload.engine_v2?.payload?.layout?.widgets ||
    [];
  const suppression = buildSafetySuppressionPlan(legacy, { max_suppressed: opts.max_generic_suppressed ?? 6 });

  return {
    widgets,
    widgets_promoted: widgets,
    suppression,
    promotion_applied: widgets.length > 0,
    render_active: true,
    phase: 'Z.25',
    cockpit_mode: 'safety_native',
    binding_ratio: safetyPilot?.engine_bridge?.binding_ratio ?? 0
  };
}

module.exports = { runSafetyRenderPromotion };
