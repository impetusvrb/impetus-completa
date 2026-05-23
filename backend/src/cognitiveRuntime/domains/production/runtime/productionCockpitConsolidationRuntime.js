'use strict';

const flagsZP0 = require('../../../config/phaseZP0FeatureFlags');
const { isProductionProfile } = require('../../../renderPromotion/production/productionControlledRenderRuntime');
const { consolidateProductionCockpit } = require('../cockpit/productionCockpitConsolidator');
const { emitProductionCockpitTelemetry } = require('../observability/productionCockpitTelemetry');
const { logPhaseZP0 } = require('../../../phaseZP0Logger');

function evaluateProductionConsolidationEligibility(payload = {}, ctx = {}, productionPilot = {}) {
  if (!flagsZP0.isProductionNativeCockpitPilot() && !ctx.force_production_consolidation) {
    return { allowed: false, reason: 'production_native_cockpit_off' };
  }
  if (!isProductionProfile(payload, ctx)) return { allowed: false, reason: 'not_production_domain' };
  if (productionPilot?.pilot_skipped) return { allowed: false, reason: productionPilot.reason || 'pilot_skipped' };
  const needsRender =
    payload.cognitive_render_promotion?.promotion_applied === true ||
    ctx.zp0_render_promoted === true ||
    ctx.force_production_consolidation === true;
  if (!needsRender) return { allowed: false, reason: 'zp0_render_promotion_required' };
  const bindingRatio = productionPilot?.engine_bridge?.binding_ratio ?? 0;
  if (bindingRatio < 0.25 && !ctx.force_production_consolidation) {
    return { allowed: false, reason: 'insufficient_binding', binding_ratio: bindingRatio };
  }
  return {
    allowed: true,
    shadow_only: flagsZP0.isProductionCognitiveRuntimeShadow() && !flagsZP0.isProductionNativeCockpitPilot(),
    binding_ratio: bindingRatio
  };
}

async function applyProductionCockpitConsolidation(user = {}, payload = {}, ctx = {}, productionPilot = {}) {
  const eligibility = evaluateProductionConsolidationEligibility(payload, ctx, productionPilot);
  if (!eligibility.allowed) {
    return {
      payload,
      ok: false,
      skipped: true,
      reason: eligibility.reason,
      production_cognitive_runtime: {
        phase: 'Z.P0',
        cockpit_mode: 'off',
        consolidation_applied: false,
        reason: eligibility.reason
      }
    };
  }

  if (eligibility.shadow_only) {
    const preview = await consolidateProductionCockpit(user, payload, ctx, productionPilot);
    return {
      payload,
      ok: true,
      shadow_compare_only: true,
      production_cockpit_preview: preview,
      production_cognitive_runtime: {
        phase: 'Z.P0',
        cockpit_mode: 'shadow',
        consolidation_applied: false,
        preview_only: true
      }
    };
  }

  try {
    const consolidated = await consolidateProductionCockpit(user, payload, ctx, productionPilot);
    const enriched = { ...payload };

    enriched.production_cognitive_centers = consolidated.centers;
    enriched.production_decision_support = consolidated.decision_support;
    enriched.production_contextual_questions = consolidated.production_contextual_questions;
    enriched.widgets_promoted = consolidated.widgets;
    enriched.widgets_legacy = consolidated.widgets_legacy;
    enriched.cockpit_operational_metrics = consolidated.operational_metrics;
    enriched.specialized_summary = consolidated.specialized_summary;

    if (enriched.profile_config) {
      enriched.profile_config = {
        ...enriched.profile_config,
        production_native_cockpit: true,
        collapsed_generic_ids: consolidated.suppression?.suppressed_generic_ids || [],
        cockpit_centers: consolidated.centers.map((c) => c.center_id)
      };
    }

    if (enriched.engine_v2?.payload?.layout) {
      enriched.engine_v2 = {
        ...enriched.engine_v2,
        payload: {
          ...enriched.engine_v2.payload,
          layout: { ...enriched.engine_v2.payload.layout, widgets: consolidated.widgets }
        }
      };
    }

    const production_cognitive_runtime = {
      phase: 'Z.P0',
      cockpit_mode: 'production_native',
      consolidation_applied: true,
      global_replace: false,
      centers: consolidated.centers,
      production_cognitive_health: consolidated.production_cognitive_health,
      density: consolidated.density,
      telemetry_readiness: consolidated.telemetry_readiness,
      semantic_validation: consolidated.semantic_validation
    };

    enriched.production_cognitive_runtime = production_cognitive_runtime;

    try {
      const flagsZP1 = require('../../../config/phaseZP1FeatureFlags');
      if (flagsZP1.isProductionLiveValidationEnabled()) {
        const liveVal = require('../liveValidation/productionLiveValidationFacade');
        const lv = await liveVal.runProductionLiveValidation(user, enriched, ctx, {
          consolidated,
          signal_bundle: null
        });
        if (!lv.skipped) {
          enriched.production_live_validation = lv.production_live_validation;
          enriched.telemetry_health = lv.telemetry_health;
          production_cognitive_runtime.live_validation = lv.production_live_validation;
        }
      }
    } catch (_) {
      /* observability-only — never break consolidation */
    }

    emitProductionCockpitTelemetry('PRODUCTION_COCKPIT_CONSOLIDATED', {
      tenant_id: user?.company_id,
      centers: consolidated.centers.length
    });
    logPhaseZP0('PRODUCTION_CONSOLIDATION_APPLIED', { profile: payload.profile_code });

    return { payload: enriched, ok: true, production_cognitive_runtime };
  } catch (err) {
    logPhaseZP0('PRODUCTION_CONSOLIDATION_ERROR', { error: err.message });
    return { payload, ok: false, error: err.message };
  }
}

module.exports = { applyProductionCockpitConsolidation, evaluateProductionConsolidationEligibility };
