'use strict';

const flagsZ26 = require('../../../config/phaseZ26FeatureFlags');
const { isHrProfile } = require('../../../renderPromotion/hr/hrControlledRenderRuntime');
const { consolidateHrCockpit } = require('../cockpit/hrCockpitConsolidator');
const { emitHrCockpitTelemetry } = require('../observability/hrCockpitTelemetry');
const { logPhaseZ26 } = require('../../../phaseZ26Logger');

function evaluateHrConsolidationEligibility(payload = {}, ctx = {}, hrPilot = {}) {
  if (!flagsZ26.isHrNativeCockpitPilot() && !ctx.force_hr_consolidation) {
    return { allowed: false, reason: 'hr_native_cockpit_off' };
  }
  if (!isHrProfile(payload, ctx)) return { allowed: false, reason: 'not_hr_domain' };
  if (hrPilot?.pilot_skipped) return { allowed: false, reason: hrPilot.reason || 'pilot_skipped' };
  const needsRender =
    payload.cognitive_render_promotion?.promotion_applied === true ||
    ctx.z26_render_promoted === true ||
    ctx.force_hr_consolidation === true;
  if (!needsRender) return { allowed: false, reason: 'z26_render_promotion_required' };
  const bindingRatio = hrPilot?.engine_bridge?.binding_ratio ?? 0;
  if (bindingRatio < 0.3 && !ctx.force_hr_consolidation) {
    return { allowed: false, reason: 'insufficient_binding', binding_ratio: bindingRatio };
  }
  return {
    allowed: true,
    shadow_only: flagsZ26.isHrCognitiveRuntimeShadow() && !flagsZ26.isHrNativeCockpitPilot(),
    binding_ratio: bindingRatio
  };
}

async function applyHrCockpitConsolidation(user = {}, payload = {}, ctx = {}, hrPilot = {}) {
  const eligibility = evaluateHrConsolidationEligibility(payload, ctx, hrPilot);
  if (!eligibility.allowed) {
    return {
      payload,
      ok: false,
      skipped: true,
      reason: eligibility.reason,
      hr_cognitive_runtime: { phase: 'Z.26', cockpit_mode: 'off', consolidation_applied: false, reason: eligibility.reason }
    };
  }

  if (eligibility.shadow_only) {
    const preview = await consolidateHrCockpit(user, payload, ctx, hrPilot);
    return {
      payload,
      ok: true,
      shadow_compare_only: true,
      hr_cockpit_preview: preview,
      hr_cognitive_runtime: { phase: 'Z.26', cockpit_mode: 'shadow', consolidation_applied: false, preview_only: true }
    };
  }

  try {
    const consolidated = await consolidateHrCockpit(user, payload, ctx, hrPilot);
    const enriched = { ...payload };

    enriched.hr_cognitive_centers = consolidated.centers;
    enriched.hr_decision_support = consolidated.decision_support;
    enriched.widgets_promoted = consolidated.widgets;
    enriched.widgets_legacy = consolidated.widgets_legacy;
    enriched.cockpit_operational_metrics = consolidated.operational_metrics;

    if (enriched.profile_config) {
      enriched.profile_config = {
        ...enriched.profile_config,
        hr_native_cockpit: true,
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
            cockpit_mode: 'hr_native'
          },
          assistente_ia: {
            ...(enriched.engine_v2.payload.assistente_ia || {}),
            especialidade: 'recursos_humanos_operacional',
            exemplos_perguntas: (consolidated.decision_support?.questions || []).map((q) => q.text)
          }
        }
      };
    }

    const runtime = {
      phase: 'Z.26',
      cockpit_mode: 'hr_native',
      consolidation_applied: true,
      specialization_ratio: consolidated.specialized_ratio,
      genericity_ratio: consolidated.generic_ratio,
      operational_focus: consolidated.operational_focus,
      render_promoted: true,
      fallback_preserved: consolidated.fallback?.preserved !== false,
      fallback_used: consolidated.fallback?.used === true,
      hr_cognitive_health: consolidated.hr_cognitive_health?.hr_cognitive_health || consolidated.hr_cognitive_health,
      centers: consolidated.centers.map((c) => ({
        center_id: c.center_id,
        label: c.label,
        layer: c.layer,
        render_slot: c.render_slot
      })),
      global_replace: false,
      rollback_safe: true,
      people_centric: true
    };

    enriched.hr_cognitive_runtime = runtime;
    enriched.cognitive_render_promotion = {
      ...(enriched.cognitive_render_promotion || {}),
      phase: 'Z.26',
      consolidation_applied: true,
      cockpit_mode: 'hr_native'
    };

    emitHrCockpitTelemetry('HR_COCKPIT_CONSOLIDATED', {
      tenant_id: user?.company_id,
      profile: payload.profile_code,
      specialization_ratio: consolidated.specialized_ratio
    });

    return { payload: enriched, ok: true, hr_cognitive_runtime: runtime, consolidated };
  } catch (err) {
    logPhaseZ26('HR_CONSOLIDATION_FALLBACK', { error: err?.message });
    return {
      payload,
      ok: false,
      skipped: true,
      reason: err?.message,
      hr_cognitive_runtime: { phase: 'Z.26', consolidation_applied: false, fallback_preserved: true }
    };
  }
}

module.exports = { evaluateHrConsolidationEligibility, applyHrCockpitConsolidation };
