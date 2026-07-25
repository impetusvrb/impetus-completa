'use strict';

const flags = require('../../config/phaseIshikawaNativeFeatureFlags');
const { evaluateIshikawaRenderPromotionEligibility } = require('./ishikawaRenderPromotionSupervisor');
const { resolvePromotedIshikawaWidgetsFromShadow } = require('./ishikawaWidgetPromotionResolver');
const { sanitizePromotedWidgets } = require('../runtime/cognitiveRenderSafety');
const { logIshikawaPromotion } = require('./ishikawaPromotionLogger');

/**
 * GF-018 — Z.22 ishikawa_native (consumidor passivo; sem recálculo de binding).
 */
function applyIshikawaControlledRenderPromotion(user = {}, payload = {}, ctx = {}, ishikawaPilot = {}) {
  const eligibility = evaluateIshikawaRenderPromotionEligibility(user, payload, ctx, ishikawaPilot);

  if (!eligibility.allowed) {
    const bindingRatio = eligibility.binding_ratio ?? ishikawaPilot?.engine_bridge?.binding_ratio ?? 0;
    logIshikawaPromotion('Z22_SKIPPED', {
      reason: eligibility.reason,
      binding_ratio: bindingRatio,
      min_required: eligibility.min_required,
      gate_scenario: bindingRatio === 0 ? 'A_NO_DATASET' : 'B_BELOW_THRESHOLD'
    });
    return {
      payload,
      ok: false,
      skipped: true,
      reason: eligibility.reason,
      cognitive_render_promotion: {
        phase: 'Z.22',
        promotion_applied: false,
        render_active: false,
        cockpit_mode: 'ishikawa_native',
        domain: 'ishikawa_native',
        reason: eligibility.reason,
        binding_ratio: bindingRatio,
        min_required: eligibility.min_required,
        bound_blocks: eligibility.bound_blocks || ishikawaPilot?.engine_bridge?.bound_blocks || [],
        missing_blocks: eligibility.missing_blocks || ishikawaPilot?.engine_bridge?.missing_blocks || [],
        signal_readiness: eligibility.signal_readiness || ishikawaPilot?.engine_bridge?.signal_readiness,
        gate_scenario: bindingRatio === 0 ? 'A_NO_DATASET' : 'B_BELOW_THRESHOLD',
        gf: 'GF-018'
      }
    };
  }

  const widgets = sanitizePromotedWidgets(
    resolvePromotedIshikawaWidgetsFromShadow(ishikawaPilot.shadow_cognitive_cockpit || {}, {
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
      cockpit_mode: 'ishikawa_native',
      domain: 'ishikawa_native',
      global_replace: false,
      binding_ratio: eligibility.binding_ratio,
      widgets_promoted_count: widgets.length,
      gate_scenario: 'C_GATE_PASS',
      gf: 'GF-018'
    }
  };

  logIshikawaPromotion('Z22_APPLIED', {
    binding_ratio: eligibility.binding_ratio,
    widgets_promoted_count: widgets.length,
    gate_scenario: 'C_GATE_PASS'
  });

  return { payload: enriched, ok: true, cognitive_render_promotion: enriched.cognitive_render_promotion };
}

module.exports = { applyIshikawaControlledRenderPromotion };
