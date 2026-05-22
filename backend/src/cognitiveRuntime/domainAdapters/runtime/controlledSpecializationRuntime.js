'use strict';

const flagsZ21 = require('../../config/phaseZ21FeatureFlags');
const { logPhaseZ21 } = require('../../phaseZ21Logger');
const { evaluatePromotionEligibility } = require('./enrichPromotionSupervisor');
const { resolveAdaptiveFallback } = require('./adaptiveFallbackResolver');
const { buildSpecializedDeliveryArtifacts } = require('./specializedDeliveryAdapter');
const { enrichSummaryPayload } = require('../quality/qualitySummaryAdapter');
const {
  validateSpecializedEnrichment
} = require('../validation/specializedEnrichmentValidator');
const { validateEnrichGovernance } = require('../validation/enrichGovernanceValidator');

async function applyControlledEnrichment(user = {}, payload = {}, ctx = {}, qualityPilot = {}) {
  const eligibility = evaluatePromotionEligibility(user, payload, ctx, qualityPilot);

  if (!eligibility.allowed) {
    return {
      payload,
      ok: false,
      skipped: true,
      reason: eligibility.reason,
      specialized_delivery: {
        phase: 'Z.21',
        mode: eligibility.mode,
        promotion_applied: false,
        reason: eligibility.reason
      }
    };
  }

  if (eligibility.shadow_compare_only && !eligibility.enrich_payload) {
    try {
      const { artifacts } = await buildSpecializedDeliveryArtifacts(user, payload, ctx, qualityPilot);
      return {
        payload,
        ok: true,
        skipped: false,
        shadow_compare_only: true,
        specialized_delivery_preview: {
          phase: 'Z.21',
          kpis_specialized: artifacts.kpis?.kpis_specialized || [],
          insights_count: artifacts.insights?.count || 0
        },
        specialized_delivery: {
          phase: 'Z.21',
          mode: 'shadow',
          promotion_applied: false,
          preview_only: true
        }
      };
    } catch (err) {
      return {
        payload,
        ok: false,
        skipped: true,
        reason: err?.message || 'preview_failed'
      };
    }
  }

  try {
    const { artifacts, bundle } = await buildSpecializedDeliveryArtifacts(
      user,
      payload,
      ctx,
      qualityPilot
    );

    const enriched = { ...payload };
    const channelsEnriched = [];

    if (artifacts.kpis) {
      enriched.kpis = artifacts.kpis.kpis;
      enriched.kpis_legacy = artifacts.kpis.kpis_legacy;
      enriched.kpis_specialized = artifacts.kpis.kpis_specialized;
      channelsEnriched.push('kpis');
    }

    if (artifacts.summary?.ok) {
      const sumOut = enrichSummaryPayload(
        { summary: enriched.summary, text: enriched.text },
        artifacts.summary
      );
      if (sumOut.enriched) {
        enriched.summary = sumOut.payload.summary;
        enriched.text = sumOut.payload.text;
        enriched.specialized_summary = sumOut.payload.specialized_summary;
        channelsEnriched.push('summary');
      }
    }

    if (artifacts.insights?.count) {
      enriched.quality_insights = artifacts.insights.insights;
      enriched.specialized_insights = artifacts.insights;
      channelsEnriched.push('insights');
    }

    if (artifacts.cockpit?.cards_enriched) {
      enriched.profile_config = artifacts.cockpit.profile_config;
      channelsEnriched.push('cockpit_hints');
    }

    if (artifacts.contextual_questions?.questions?.length) {
      enriched.quality_contextual_questions = artifacts.contextual_questions.questions;
      channelsEnriched.push('contextual_questions');
    }

    if (artifacts.operational_metrics) {
      enriched.quality_operational_metrics = artifacts.operational_metrics;
      channelsEnriched.push('operational_metrics');
    }

    const genericityReduction = artifacts.kpis?.genericity_reduction ?? 0;
    const enrichmentValidation = validateSpecializedEnrichment(enriched, {
      channels_enriched: channelsEnriched,
      binding_ratio: qualityPilot?.engine_bridge?.binding_ratio
    });
    const governanceValidation = validateEnrichGovernance(enriched, payload, eligibility);

    const report = {
      phase: 'Z.21',
      mode: 'enrich',
      promotion_applied: true,
      delivery_mutation: true,
      legacy_cockpit_preserved: true,
      replace_render: false,
      channels_enriched: channelsEnriched,
      genericity_reduction: genericityReduction,
      specialized_kpi_count: artifacts.kpis?.specialized_count ?? 0,
      generic_removed_count: artifacts.kpis?.generic_removed_count ?? 0,
      binding_ratio: qualityPilot?.engine_bridge?.binding_ratio,
      blocks_bound: qualityPilot?.engine_bridge?.blocks_bound,
      enrichment_validation: enrichmentValidation,
      governance_validation: governanceValidation,
      rollback_safe: true,
      assistive_only: true
    };

    enriched.specialized_delivery = report;

    if (flagsZ21.isSpecializedDeliveryShadowCompare() || process.env.IMPETUS_SPECIALIZED_DELIVERY_OBSERVABILITY !== 'off') {
      logPhaseZ21('SPECIALIZED_DELIVERY_ENRICHED', {
        tenant_id: user?.company_id,
        profile: payload.profile_code,
        channels: channelsEnriched.join(','),
        genericity_reduction: genericityReduction,
        specialized_kpis: artifacts.kpis?.specialized_count
      });
    }

    return {
      payload: enriched,
      ok: true,
      skipped: false,
      specialized_delivery: report,
      bundle_meta: {
        signal_ok: bundle.signalBundle?.ok,
        bindings_count: bundle.bindings?.length
      }
    };
  } catch (err) {
    const fallback = resolveAdaptiveFallback(payload, {
      ok: false,
      reason: err?.message || 'enrich_error',
      fallback_required: true
    });
    logPhaseZ21('SPECIALIZED_DELIVERY_FALLBACK', {
      tenant_id: user?.company_id,
      reason: fallback.reason
    });
    return {
      payload: fallback.payload,
      ok: false,
      skipped: true,
      reason: fallback.reason,
      specialized_delivery: fallback.payload.specialized_delivery
    };
  }
}

/**
 * Canal KPI dedicado — /dashboard/kpis
 */
async function enrichKpiChannel(user = {}, legacyKpis = [], ctx = {}, qualityPilot = {}) {
  const payload = {
    profile_code: ctx.profile_code,
    functional_area: ctx.functional_area || 'quality',
    functional_axis: ctx.functional_axis || 'quality',
    kpis: legacyKpis,
    governance_freeze_state: ctx.governance_freeze_state
  };

  const result = await applyControlledEnrichment(user, payload, ctx, qualityPilot);
  if (!result.ok || result.skipped) {
    return {
      kpis: legacyKpis,
      kpi_enrichment: { applied: false, reason: result.reason }
    };
  }

  return {
    kpis: result.payload.kpis || legacyKpis,
    kpis_legacy: result.payload.kpis_legacy,
    kpis_specialized: result.payload.kpis_specialized,
    kpi_enrichment: {
      applied: true,
      phase: 'Z.21',
      genericity_reduction: result.specialized_delivery?.genericity_reduction,
      specialized_count: result.specialized_delivery?.specialized_kpi_count
    },
    specialized_delivery: result.specialized_delivery
  };
}

module.exports = {
  applyControlledEnrichment,
  enrichKpiChannel
};
