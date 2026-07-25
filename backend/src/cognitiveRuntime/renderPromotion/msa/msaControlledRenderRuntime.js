'use strict';

const flags = require('../../config/phaseMsaNativeFeatureFlags');
const { evaluateMsaRenderPromotionEligibility } = require('./msaRenderPromotionSupervisor');
const { resolvePromotedMsaWidgetsFromShadow } = require('./msaWidgetPromotionResolver');
const { sanitizePromotedWidgets } = require('../runtime/cognitiveRenderSafety');

/**
 * GF-011 — Z.22 msa_native (consumidor passivo; sem recálculo de binding).
 */
function applyMsaControlledRenderPromotion(user = {}, payload = {}, ctx = {}, msaPilot = {}) {
  const eligibility = evaluateMsaRenderPromotionEligibility(user, payload, ctx, msaPilot);

  if (!eligibility.allowed) {
    const bindingRatio = eligibility.binding_ratio ?? msaPilot?.engine_bridge?.binding_ratio ?? 0;
    return {
      payload,
      ok: false,
      skipped: true,
      reason: eligibility.reason,
      cognitive_render_promotion: {
        phase: 'Z.22',
        promotion_applied: false,
        render_active: false,
        cockpit_mode: 'msa_native',
        domain: 'msa_native',
        reason: eligibility.reason,
        binding_ratio: bindingRatio,
        min_required: eligibility.min_required,
        bound_blocks: eligibility.bound_blocks || msaPilot?.engine_bridge?.bound_blocks || [],
        missing_blocks: eligibility.missing_blocks || msaPilot?.engine_bridge?.missing_blocks || [],
        signal_readiness: eligibility.signal_readiness || msaPilot?.engine_bridge?.signal_readiness,
        gate_scenario: bindingRatio === 0 ? 'A_NO_DATASET' : 'B_BELOW_THRESHOLD',
        gf: 'GF-011'
      }
    };
  }

  const widgets = sanitizePromotedWidgets(
    resolvePromotedMsaWidgetsFromShadow(msaPilot.shadow_cognitive_cockpit || {}, {
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
      cockpit_mode: 'msa_native',
      domain: 'msa_native',
      global_replace: false,
      binding_ratio: eligibility.binding_ratio,
      widgets_promoted_count: widgets.length,
      gate_scenario: 'C_GATE_PASS',
      gf: 'GF-011'
    }
  };

  return { payload: enriched, ok: true, cognitive_render_promotion: enriched.cognitive_render_promotion };
}

module.exports = { applyMsaControlledRenderPromotion };
