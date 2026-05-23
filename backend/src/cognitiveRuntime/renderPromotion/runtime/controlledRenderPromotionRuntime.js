'use strict';

const flagsZ22 = require('../../config/phaseZ22FeatureFlags');
const { runQualityRenderPromotion } = require('../quality/qualityRenderPromotionEngine');
const { evaluateRenderPromotionEligibility } = require('./renderPromotionSupervisor');
const { resolveRenderChannels } = require('./adaptiveRenderResolver');
const { buildRollbackSnapshot } = require('./renderPromotionRollback');
const { sanitizePromotedWidgets } = require('./cognitiveRenderSafety');
const { emitRenderPromotionTelemetry } = require('../observability/renderPromotionTelemetry');
const { computeRenderSpecializationMetrics } = require('../observability/renderSpecializationMetrics');
const { assessRenderGovernanceHealth } = require('../observability/renderGovernanceHealth');

function _legacyWidgetList(payload = {}) {
  return (
    payload.engine_v2?.payload?.layout?.widgets ||
    payload.profile_config?.widgets ||
    payload.widgets ||
    []
  );
}

function applyControlledRenderPromotion(user = {}, payload = {}, ctx = {}, qualityPilot = {}) {
  const eligibility = evaluateRenderPromotionEligibility(user, payload, ctx, qualityPilot);

  if (!eligibility.allowed) {
    return {
      payload,
      ok: false,
      skipped: true,
      reason: eligibility.reason,
      cognitive_render_promotion: {
        phase: 'Z.22',
        mode: eligibility.mode,
        promotion_applied: false,
        render_active: false,
        reason: eligibility.reason
      }
    };
  }

  if (eligibility.shadow_compare_only) {
    const shadow = qualityPilot.shadow_cognitive_cockpit || {};
    const preview = runQualityRenderPromotion(shadow, payload, qualityPilot, {
      max_promoted_widgets: flagsZ22.maxPromotedWidgets(),
      max_generic_suppressed: flagsZ22.maxGenericSuppressed()
    });
    return {
      payload,
      ok: true,
      skipped: false,
      shadow_compare_only: true,
      cognitive_render_promotion_preview: {
        widgets: preview.widgets,
        widgets_promoted: preview.widgets_promoted,
        suppression: preview.suppression
      },
      cognitive_render_promotion: {
        phase: 'Z.22',
        mode: 'shadow',
        promotion_applied: false,
        render_active: false,
        preview_only: true
      }
    };
  }

  const channels = resolveRenderChannels({
    ...ctx,
    has_engine_v2: !!payload.engine_v2?.payload?.layout?.widgets,
    force_render_promotion: ctx.force_render_promotion
  });

  const shadow = qualityPilot.shadow_cognitive_cockpit || {};
  const beforeWidgets = _legacyWidgetList(payload);

  const promotion = runQualityRenderPromotion(shadow, payload, qualityPilot, {
    max_promoted_widgets: channels.max_promoted_widgets,
    max_generic_suppressed: channels.max_generic_suppressed,
    rollback_token: `z22_${user?.company_id || 't'}_${Date.now()}`
  });

  const safeWidgets = sanitizePromotedWidgets(promotion.widgets, {
    governance_locked: payload.governance_freeze_state?.governance_locked === true
  });

  const metrics = computeRenderSpecializationMetrics(beforeWidgets, safeWidgets);
  const rollback = buildRollbackSnapshot(payload, promotion);

  const report = {
    phase: 'Z.22',
    mode: 'controlled',
    promotion_applied: true,
    render_active: true,
    pilot_profile: eligibility.pilot_profile,
    binding_ratio: eligibility.binding_ratio,
    channels_promoted: ['cockpit_widgets'],
    widgets_promoted_count: promotion.widgets_promoted?.length ?? 0,
    generic_suppressed_count: promotion.suppression?.generic_suppressed_count ?? 0,
    operational_weight: promotion.operational_weight,
    render_metrics: metrics,
    fallback: promotion.fallback,
    rollback_snapshot: rollback,
    global_replace: false,
    legacy_widgets_preserved: true,
    replace_render: true,
    controlled_replacement: true
  };

  const governanceHealth = assessRenderGovernanceHealth(payload, report, eligibility);
  report.governance_health = governanceHealth;

  const enriched = { ...payload };
  enriched.cognitive_render_promotion = report;
  enriched.widgets_promoted = safeWidgets;
  enriched.widgets_legacy = promotion.widgets_legacy;

  if (channels.channels.engine_v2_layout && enriched.engine_v2?.payload?.layout) {
    enriched.engine_v2 = {
      ...enriched.engine_v2,
      payload: {
        ...enriched.engine_v2.payload,
        layout: {
          ...enriched.engine_v2.payload.layout,
          widgets: safeWidgets,
          widgets_legacy: promotion.widgets_legacy,
          render_promotion_applied: true
        }
      }
    };
  }

  if (channels.channels.profile_config) {
    const pc = enriched.profile_config || {};
    enriched.profile_config = {
      ...pc,
      widgets: safeWidgets,
      widgets_legacy: promotion.widgets_legacy,
      widgets_promoted: promotion.widgets_promoted,
      render_promotion_mode: 'controlled',
      specialized_cockpit_hints: (pc.specialized_cockpit_hints || []).map((h) => ({
        ...h,
        render_active: true
      }))
    };
  }

  emitRenderPromotionTelemetry('COGNITIVE_RENDER_PROMOTED', {
    tenant_id: user?.company_id,
    profile: payload.profile_code,
    promoted: report.widgets_promoted_count,
    suppressed: report.generic_suppressed_count,
    specialized_ratio: metrics.specialized_render_ratio
  });

  return {
    payload: enriched,
    ok: true,
    skipped: false,
    cognitive_render_promotion: report
  };
}

module.exports = { applyControlledRenderPromotion };
