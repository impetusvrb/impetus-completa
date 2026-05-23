'use strict';

const flagsZ23 = require('../../config/phaseZ23FeatureFlags');
const { isQualityProfile } = require('../../domainAdapters/runtime/enrichPromotionSupervisor');
const { consolidateQualityCockpit } = require('../quality/qualityCockpitConsolidator');
const { emitCockpitSpecializationTelemetry } = require('../observability/cockpitSpecializationTelemetry');
const { logPhaseZ23 } = require('../../phaseZ23Logger');

function evaluateConsolidationEligibility(payload = {}, ctx = {}, qualityPilot = {}) {
  if (!flagsZ23.isSpecializedCockpitActive() && !ctx.force_cockpit_consolidation) {
    return { allowed: false, reason: 'specialized_cockpit_off' };
  }
  if (!flagsZ23.isQualityNativeCockpitPilot() && !ctx.force_cockpit_consolidation) {
    return { allowed: false, reason: 'quality_native_pilot_off' };
  }
  const profile = String(payload.profile_code || ctx.profile_code || '');
  if (!flagsZ23.isPilotProfile(profile) && !ctx.force_cockpit_consolidation) {
    return { allowed: false, reason: 'not_pilot_profile', profile_code: profile };
  }
  if (!isQualityProfile(payload, ctx)) {
    return { allowed: false, reason: 'not_quality_domain' };
  }
  if (qualityPilot?.pilot_skipped) {
    return { allowed: false, reason: qualityPilot.reason || 'pilot_skipped' };
  }
  const needsZ22 =
    payload.cognitive_render_promotion?.promotion_applied === true ||
    ctx.z22_render_promoted === true ||
    ctx.force_cockpit_consolidation === true ||
    ctx.force_render_promotion === true;
  if (!needsZ22) {
    return { allowed: false, reason: 'z22_render_promotion_required' };
  }
  const bindingRatio = qualityPilot?.engine_bridge?.binding_ratio ?? 0;
  if (bindingRatio < 0.35 && !ctx.force_cockpit_consolidation) {
    return { allowed: false, reason: 'insufficient_binding', binding_ratio: bindingRatio };
  }
  if (payload.governance_freeze_state?.mutation_after_lock_detected) {
    return { allowed: false, reason: 'mutation_after_lock' };
  }
  return {
    allowed: true,
    consolidate: true,
    shadow_only: flagsZ23.isSpecializedCockpitShadow(),
    binding_ratio: bindingRatio
  };
}

async function applyCognitiveCockpitConsolidation(user = {}, payload = {}, ctx = {}, qualityPilot = {}) {
  const eligibility = evaluateConsolidationEligibility(payload, ctx, qualityPilot);

  if (!eligibility.allowed) {
    return {
      payload,
      ok: false,
      skipped: true,
      reason: eligibility.reason,
      specialized_cockpit_runtime: {
        phase: 'Z.23',
        cockpit_mode: 'off',
        consolidation_applied: false,
        reason: eligibility.reason
      }
    };
  }

  if (eligibility.shadow_only) {
    const preview = await consolidateQualityCockpit(user, payload, ctx, qualityPilot);
    return {
      payload,
      ok: true,
      shadow_compare_only: true,
      specialized_cockpit_preview: preview,
      specialized_cockpit_runtime: {
        phase: 'Z.23',
        cockpit_mode: 'shadow',
        consolidation_applied: false,
        preview_only: true
      }
    };
  }

  try {
    const consolidated = await consolidateQualityCockpit(user, payload, ctx, qualityPilot);
    const enriched = { ...payload };

    enriched.quality_cognitive_centers = consolidated.centers;
    enriched.quality_decision_support = consolidated.decision_support;
    enriched.widgets_promoted = consolidated.widgets;
    enriched.widgets_legacy = consolidated.widgets_legacy;
    enriched.cockpit_operational_metrics = consolidated.operational_metrics;

    if (consolidated.summary_patch) {
      enriched.summary = consolidated.summary_patch.summary;
      enriched.text = consolidated.summary_patch.text;
      enriched.specialized_summary = consolidated.summary_patch.specialized_summary;
      enriched.summary_consolidation_applied = true;
    }

    if (enriched.profile_config) {
      enriched.profile_config = {
        ...enriched.profile_config,
        quality_native_cockpit: true,
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
            cockpit_consolidation_applied: true
          },
          assistente_ia: {
            ...(enriched.engine_v2.payload.assistente_ia || {}),
            especialidade: 'qualidade_operacional',
            exemplos_perguntas: (consolidated.decision_support?.questions || []).map((q) => q.text)
          }
        }
      };
    }

    const runtime = {
      phase: 'Z.23',
      cockpit_mode: 'quality_native',
      consolidation_applied: true,
      specialized_ratio: consolidated.specialized_ratio,
      generic_ratio: consolidated.generic_ratio,
      operational_focus: consolidated.operational_focus,
      cognitive_health: consolidated.cognitive_health,
      density: consolidated.density,
      usefulness: consolidated.usefulness,
      fallback_preserved: consolidated.fallback?.preserved !== false,
      fallback_used: consolidated.fallback?.used === true,
      centers: consolidated.centers.map((c) => ({
        center_id: c.center_id,
        label: c.label,
        layer: c.layer,
        render_slot: c.render_slot
      })),
      global_replace: false,
      rollback_safe: true
    };

    enriched.specialized_cockpit_runtime = runtime;
    enriched.cognitive_render_promotion = {
      ...(enriched.cognitive_render_promotion || {}),
      phase: 'Z.23',
      consolidation_applied: true,
      cockpit_mode: 'quality_native'
    };

    emitCockpitSpecializationTelemetry('QUALITY_COCKPIT_CONSOLIDATED', {
      tenant_id: user?.company_id,
      profile: payload.profile_code,
      specialized_ratio: consolidated.specialized_ratio,
      centers: consolidated.centers.length,
      health: consolidated.cognitive_health?.specialization
    });

    return {
      payload: enriched,
      ok: true,
      specialized_cockpit_runtime: runtime,
      consolidated
    };
  } catch (err) {
    logPhaseZ23('COCKPIT_CONSOLIDATION_FALLBACK', {
      tenant_id: user?.company_id,
      error: err?.message
    });
    return {
      payload,
      ok: false,
      skipped: true,
      reason: err?.message || 'consolidation_error',
      specialized_cockpit_runtime: {
        phase: 'Z.23',
        consolidation_applied: false,
        fallback_preserved: true,
        reason: 'consolidation_error'
      }
    };
  }
}

module.exports = {
  evaluateConsolidationEligibility,
  applyCognitiveCockpitConsolidation
};
