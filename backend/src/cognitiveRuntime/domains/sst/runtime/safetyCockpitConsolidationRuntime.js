'use strict';

const flagsZ25 = require('../../../config/phaseZ25FeatureFlags');
const { isSafetyProfile } = require('../../../renderPromotion/safety/safetyControlledRenderRuntime');
const { consolidateSafetyCockpit } = require('../cockpit/safetyCockpitConsolidator');
const { emitSafetyCockpitTelemetry } = require('../observability/safetyCockpitTelemetry');
const { logPhaseZ25 } = require('../../../phaseZ25Logger');

function evaluateSafetyConsolidationEligibility(payload = {}, ctx = {}, safetyPilot = {}) {
  if (!flagsZ25.isSstNativeCockpitPilot() && !ctx.force_safety_consolidation) {
    return { allowed: false, reason: 'sst_native_cockpit_off' };
  }
  if (!isSafetyProfile(payload, ctx)) {
    return { allowed: false, reason: 'not_safety_domain' };
  }
  if (safetyPilot?.pilot_skipped) {
    return { allowed: false, reason: safetyPilot.reason || 'pilot_skipped' };
  }
  const needsRender =
    payload.cognitive_render_promotion?.promotion_applied === true ||
    ctx.z25_render_promoted === true ||
    ctx.force_safety_consolidation === true;
  if (!needsRender) {
    return { allowed: false, reason: 'z25_render_promotion_required' };
  }
  const bindingRatio = safetyPilot?.engine_bridge?.binding_ratio ?? 0;
  if (bindingRatio < 0.3 && !ctx.force_safety_consolidation) {
    return { allowed: false, reason: 'insufficient_binding', binding_ratio: bindingRatio };
  }
  return {
    allowed: true,
    shadow_only: flagsZ25.isSafetyCognitiveRuntimeShadow() && !flagsZ25.isSstNativeCockpitPilot(),
    binding_ratio: bindingRatio
  };
}

async function applySafetyCockpitConsolidation(user = {}, payload = {}, ctx = {}, safetyPilot = {}) {
  const eligibility = evaluateSafetyConsolidationEligibility(payload, ctx, safetyPilot);
  if (!eligibility.allowed) {
    return {
      payload,
      ok: false,
      skipped: true,
      reason: eligibility.reason,
      sst_cognitive_runtime: {
        phase: 'Z.25',
        cockpit_mode: 'off',
        consolidation_applied: false,
        reason: eligibility.reason
      }
    };
  }

  if (eligibility.shadow_only) {
    const preview = await consolidateSafetyCockpit(user, payload, ctx, safetyPilot);
    return {
      payload,
      ok: true,
      shadow_compare_only: true,
      sst_cockpit_preview: preview,
      sst_cognitive_runtime: { phase: 'Z.25', cockpit_mode: 'shadow', consolidation_applied: false, preview_only: true }
    };
  }

  try {
    const consolidated = await consolidateSafetyCockpit(user, payload, ctx, safetyPilot);
    const enriched = { ...payload };

    enriched.safety_cognitive_centers = consolidated.centers;
    enriched.safety_decision_support = consolidated.decision_support;
    enriched.widgets_promoted = consolidated.widgets;
    enriched.widgets_legacy = consolidated.widgets_legacy;
    enriched.cockpit_operational_metrics = consolidated.operational_metrics;

    if (enriched.profile_config) {
      enriched.profile_config = {
        ...enriched.profile_config,
        safety_native_cockpit: true,
        collapsed_generic_ids: consolidated.suppression?.suppressed_generic_ids || [],
        cockpit_centers: consolidated.centers.map((c) => c.center_id)
      };
    }

    if (enriched.engine_v2?.payload?.layout) {
      enriched.engine_v2 = {
        ...enriched.engine_v2,
        payload: {
          ...enriched.engine_v2.payload,
          layout: {
            ...enriched.engine_v2.payload.layout,
            widgets: consolidated.widgets,
            widgets_legacy: consolidated.widgets_legacy,
            cockpit_consolidation_applied: true,
            cockpit_mode: 'safety_native'
          },
          assistente_ia: {
            ...(enriched.engine_v2.payload.assistente_ia || {}),
            especialidade: 'seguranca_operacional',
            exemplos_perguntas: (consolidated.decision_support?.questions || []).map((q) => q.text)
          }
        }
      };
    }

    const runtime = {
      phase: 'Z.25',
      cockpit_mode: 'safety_native',
      consolidation_applied: true,
      specialization_ratio: consolidated.specialized_ratio,
      genericity_ratio: consolidated.generic_ratio,
      operational_focus: consolidated.operational_focus,
      render_promoted: true,
      fallback_preserved: consolidated.fallback?.preserved !== false,
      fallback_used: consolidated.fallback?.used === true,
      safety_cognitive_health: consolidated.safety_cognitive_health?.safety_cognitive_health || consolidated.safety_cognitive_health,
      centers: consolidated.centers.map((c) => ({
        center_id: c.center_id,
        label: c.label,
        layer: c.layer,
        render_slot: c.render_slot
      })),
      global_replace: false,
      rollback_safe: true
    };

    enriched.sst_cognitive_runtime = runtime;
    enriched.cognitive_render_promotion = {
      ...(enriched.cognitive_render_promotion || {}),
      phase: 'Z.25',
      consolidation_applied: true,
      cockpit_mode: 'safety_native'
    };

    emitSafetyCockpitTelemetry('SAFETY_COCKPIT_CONSOLIDATED', {
      tenant_id: user?.company_id,
      profile: payload.profile_code,
      specialization_ratio: consolidated.specialized_ratio
    });

    return { payload: enriched, ok: true, sst_cognitive_runtime: runtime, consolidated };
  } catch (err) {
    logPhaseZ25('SAFETY_CONSOLIDATION_FALLBACK', { error: err?.message });
    return {
      payload,
      ok: false,
      skipped: true,
      reason: err?.message,
      sst_cognitive_runtime: { phase: 'Z.25', consolidation_applied: false, fallback_preserved: true }
    };
  }
}

module.exports = { evaluateSafetyConsolidationEligibility, applySafetyCockpitConsolidation };
