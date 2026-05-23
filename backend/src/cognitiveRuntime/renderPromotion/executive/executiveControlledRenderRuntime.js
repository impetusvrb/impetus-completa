'use strict';

const flags = require('../../config/phaseZ27FeatureFlags');
const { resolvePromotedExecutiveWidgetsFromShadow } = require('./executiveWidgetPromotionResolver');
const { buildExecutiveSuppressionPlan } = require('./executiveWidgetSuppression');
const { sanitizePromotedWidgets } = require('../runtime/cognitiveRenderSafety');
const { resolveExecutiveContext } = require('../../domains/executive/aggregation/executiveContextResolver');

function isExecutiveProfile(payload = {}, ctx = {}) {
  return resolveExecutiveContext({}, payload, ctx).is_executive_profile;
}

function applyExecutiveControlledRenderPromotion(user = {}, payload = {}, ctx = {}, execPilot = {}) {
  if (!flags.isExecutiveRenderPromotionControlled() && !ctx.force_executive_render) {
    return { payload, skipped: true, reason: 'executive_render_off' };
  }
  if (!isExecutiveProfile(payload, ctx)) return { payload, skipped: true, reason: 'not_executive_profile' };
  if (execPilot?.pilot_skipped) return { payload, skipped: true, reason: execPilot.reason };

  const widgets = sanitizePromotedWidgets(
    resolvePromotedExecutiveWidgetsFromShadow(execPilot.shadow_cognitive_cockpit || {}, { max_widgets: flags.maxWidgets() })
  );
  const suppression = buildExecutiveSuppressionPlan(payload.widgets_legacy || payload.profile_config?.widgets || []);
  const enriched = {
    ...payload,
    widgets_promoted: widgets,
    widgets_legacy: payload.widgets_legacy || payload.profile_config?.widgets,
    cognitive_render_promotion: {
      phase: 'Z.27',
      promotion_applied: true,
      render_active: true,
      cockpit_mode: 'executive_boardroom',
      suppression,
      global_replace: false
    }
  };
  return { payload: enriched, ok: true, cognitive_render_promotion: enriched.cognitive_render_promotion };
}

module.exports = { applyExecutiveControlledRenderPromotion, isExecutiveProfile };
