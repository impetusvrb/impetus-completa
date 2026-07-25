'use strict';

const flags = require('../../config/phaseLogisticsNativeFeatureFlags');
const { isLogisticsProfile } = require('../../domains/logistics/runtime/logisticsRuntimeDescriptor');
const { evaluateLogisticsRenderPromotionEligibility } = require('./logisticsRenderPromotionSupervisor');
const { resolvePromotedLogisticsWidgetsFromShadow } = require('./logisticsWidgetPromotionResolver');
const { sanitizePromotedWidgets } = require('../runtime/cognitiveRenderSafety');

/**
 * INC-041 — Z.22 logistics_native (consumidor passivo; sem recálculo de binding).
 */
function applyLogisticsControlledRenderPromotion(user = {}, payload = {}, ctx = {}, logisticsPilot = {}) {
  const eligibility = evaluateLogisticsRenderPromotionEligibility(user, payload, ctx, logisticsPilot);

  if (!eligibility.allowed) {
    return {
      payload,
      ok: false,
      skipped: true,
      reason: eligibility.reason,
      cognitive_render_promotion: {
        phase: 'Z.22',
        promotion_applied: false,
        render_active: false,
        cockpit_mode: 'logistics_native',
        reason: eligibility.reason,
        binding_ratio: eligibility.binding_ratio,
        min_required: eligibility.min_required
      }
    };
  }

  const widgets = sanitizePromotedWidgets(
    resolvePromotedLogisticsWidgetsFromShadow(logisticsPilot.shadow_cognitive_cockpit || {}, {
      max_widgets: flags.maxWidgets()
    })
  );

  const enriched = {
    ...payload,
    widgets_promoted: widgets,
    widgets_legacy: payload.widgets_legacy || payload.profile_config?.widgets,
    cognitive_render_promotion: {
      phase: 'Z.22',
      promotion_applied: true,
      render_active: true,
      cockpit_mode: 'logistics_native',
      global_replace: false,
      binding_ratio: eligibility.binding_ratio,
      widgets_promoted_count: widgets.length,
      inc: 'INC-041'
    }
  };

  return { payload: enriched, ok: true, cognitive_render_promotion: enriched.cognitive_render_promotion };
}

module.exports = { applyLogisticsControlledRenderPromotion, isLogisticsProfile };
