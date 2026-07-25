'use strict';

const flags = require('../../config/phasePpapNativeFeatureFlags');
const { evaluatePpapRenderPromotionEligibility } = require('./ppapRenderPromotionSupervisor');
const { resolvePromotedPpapWidgetsFromShadow } = require('./ppapWidgetPromotionResolver');
const { sanitizePromotedWidgets } = require('../runtime/cognitiveRenderSafety');

/**
 * GF-004 — Z.22 ppap_native (consumidor passivo; sem recálculo de binding).
 */
function applyPpapControlledRenderPromotion(user = {}, payload = {}, ctx = {}, ppapPilot = {}) {
  const eligibility = evaluatePpapRenderPromotionEligibility(user, payload, ctx, ppapPilot);

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
        cockpit_mode: 'ppap_native',
        domain: 'ppap_native',
        reason: eligibility.reason,
        binding_ratio: eligibility.binding_ratio ?? ppapPilot?.engine_bridge?.binding_ratio ?? 0,
        min_required: eligibility.min_required,
        bound_blocks: eligibility.bound_blocks || ppapPilot?.engine_bridge?.bound_blocks || [],
        missing_blocks: eligibility.missing_blocks || ppapPilot?.engine_bridge?.missing_blocks || [],
        signal_readiness: eligibility.signal_readiness || ppapPilot?.engine_bridge?.signal_readiness,
        gate_scenario: (eligibility.binding_ratio ?? 0) === 0 ? 'A_NO_DATASET' : 'B_BELOW_THRESHOLD',
        gf: 'GF-004'
      }
    };
  }

  const widgets = sanitizePromotedWidgets(
    resolvePromotedPpapWidgetsFromShadow(ppapPilot.shadow_cognitive_cockpit || {}, {
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
      cockpit_mode: 'ppap_native',
      domain: 'ppap_native',
      global_replace: false,
      binding_ratio: eligibility.binding_ratio,
      widgets_promoted_count: widgets.length,
      gate_scenario: 'C_GATE_PASS',
      gf: 'GF-004'
    }
  };

  return { payload: enriched, ok: true, cognitive_render_promotion: enriched.cognitive_render_promotion };
}

module.exports = { applyPpapControlledRenderPromotion };
