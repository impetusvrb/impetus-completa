'use strict';

const flags = require('../../config/phaseP1EnvironmentalFeatureFlags');
const { resolvePromotedEnvironmentalWidgetsFromShadow } = require('./environmentalWidgetPromotionResolver');
const { buildEnvironmentalSuppressionPlan } = require('./environmentalWidgetSuppression');
const { sanitizePromotedWidgets } = require('../runtime/cognitiveRenderSafety');

function isEnvironmentalProfile(payload = {}, ctx = {}) {
  const pc = String(payload.profile_code || ctx.profile_code || '').toLowerCase();
  const axis = String(payload.functional_axis || payload.functional_area || '').toLowerCase();
  return flags.isPilotProfile(pc) || axis === 'environmental' || axis === 'ambiental' || axis === 'sustainability';
}

function applyEnvironmentalControlledRenderPromotion(user = {}, payload = {}, ctx = {}, envPilot = {}) {
  if (!flags.isEnvironmentalRenderPromotionControlled() && !ctx.force_environmental_render) {
    return { payload, skipped: true, reason: 'environmental_render_off' };
  }
  if (!isEnvironmentalProfile(payload, ctx)) return { payload, skipped: true, reason: 'not_environmental_profile' };
  if (envPilot?.pilot_skipped) return { payload, skipped: true, reason: envPilot.reason };

  const widgets = sanitizePromotedWidgets(
    resolvePromotedEnvironmentalWidgetsFromShadow(envPilot.shadow_cognitive_cockpit || {}, { max_widgets: 8 })
  );
  const suppression = buildEnvironmentalSuppressionPlan(payload.widgets_legacy || payload.profile_config?.widgets || []);
  const enriched = {
    ...payload,
    widgets_promoted: widgets,
    widgets_legacy: payload.widgets_legacy || payload.profile_config?.widgets,
    cognitive_render_promotion: {
      phase: 'P1-ENV',
      promotion_applied: true,
      render_active: true,
      cockpit_mode: 'environmental_native',
      suppression,
      global_replace: false
    }
  };
  return { payload: enriched, ok: true, cognitive_render_promotion: enriched.cognitive_render_promotion };
}

module.exports = { applyEnvironmentalControlledRenderPromotion, isEnvironmentalProfile };
