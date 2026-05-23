'use strict';

const flags = require('../../../config/phaseP1EnvironmentalFeatureFlags');
const { isEnvironmentalProfile, applyEnvironmentalControlledRenderPromotion } = require('../../../renderPromotion/environmental/environmentalControlledRenderRuntime');
const { consolidateEnvironmentalCockpit } = require('../cockpit/environmentalCockpitConsolidator');
const { emitEnvironmentalCockpitTelemetry } = require('../observability/environmentalCockpitTelemetry');

async function applyEnvironmentalCockpitConsolidation(user = {}, payload = {}, ctx = {}, envPilot = {}) {
  if (!flags.isEnvironmentalNativeCockpitPilot() && !ctx.force_environmental_consolidation) {
    return { payload, skipped: true, reason: 'environmental_native_cockpit_off' };
  }
  if (!isEnvironmentalProfile(payload, ctx)) return { payload, skipped: true, reason: 'not_environmental_domain' };
  if (envPilot?.pilot_skipped) return { payload, skipped: true, reason: envPilot.reason };
  if (
    payload.cognitive_render_promotion?.promotion_applied !== true &&
    ctx.p1env_render_promoted !== true &&
    ctx.force_environmental_consolidation !== true
  ) {
    return { payload, skipped: true, reason: 'p1env_render_promotion_required' };
  }

  if (flags.isEnvironmentalCognitiveRuntimeShadow() && !flags.isEnvironmentalNativeCockpitPilot() && !ctx.force_environmental_consolidation) {
    const preview = await consolidateEnvironmentalCockpit(user, payload, ctx, envPilot);
    return { payload, ok: true, shadow_compare_only: true, environmental_cockpit_preview: preview };
  }

  const consolidated = await consolidateEnvironmentalCockpit(user, payload, ctx, envPilot);
  const enriched = { ...payload };
  enriched.environmental_cognitive_centers = consolidated.centers;
  enriched.environmental_decision_support = consolidated.decision_support;
  enriched.environmental_contextual_questions = consolidated.environmental_contextual_questions;
  enriched.widgets_promoted = consolidated.widgets;
  enriched.specialized_summary = consolidated.specialized_summary;

  const environmental_cognitive_runtime = {
    phase: 'P1-ENV',
    cockpit_mode: 'environmental_native',
    consolidation_applied: true,
    global_replace: false,
    centers: consolidated.centers,
    environmental_cognitive_health: consolidated.environmental_cognitive_health,
    density: consolidated.density,
    telemetry_readiness: consolidated.telemetry_readiness,
    semantic_validation: consolidated.semantic_validation,
    regulatory_governance: consolidated.regulatory_governance
  };
  enriched.environmental_cognitive_runtime = environmental_cognitive_runtime;

  if (flags.isEnvironmentalLiveValidationEnabled()) {
    try {
      const lv = require('../liveValidation/environmentalLiveValidationFacade');
      const report = await lv.runEnvironmentalLiveValidation(user, enriched, ctx, { consolidated, signal_bundle: null });
      if (!report.skipped) {
        enriched.environmental_live_validation = report.environmental_live_validation;
        enriched.environmental_telemetry_health = report.environmental_telemetry_health;
      }
    } catch (_) {}
  }

  emitEnvironmentalCockpitTelemetry('ENVIRONMENTAL_COCKPIT_CONSOLIDATED', { tenant_id: user?.company_id, centers: consolidated.centers.length });
  return { payload: enriched, ok: true, environmental_cognitive_runtime };
}

module.exports = { applyEnvironmentalCockpitConsolidation };
