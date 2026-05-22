'use strict';

const flags = require('../config/phaseZ18FeatureFlags');
const flagsZ19 = require('../config/phaseZ19FeatureFlags');
const flagsZ21 = require('../config/phaseZ21FeatureFlags');
const { applyControlledEnrichment, enrichKpiChannel } = require('../domainAdapters/runtime/controlledSpecializationRuntime');
const { logPhaseZ18 } = require('../phaseZ18Logger');
const registry = require('../registry/cognitiveBlockRegistry');
const { buildCognitiveObservabilityReport } = require('../observability/cognitiveObservability');
const { resolveShadowCompositionPlan } = require('../composition/compositionShadowResolver');
const { validateRuntimeComposition } = require('../validation/runtimeCompositionValidator');
const { runQualityCockpitPilot } = require('../pilot/qualityCockpitPilot');
const { compareGenericVsSpecialized } = require('../pilot/qualityCockpitCompare');

function getCognitiveRuntimeStatus(ctx = {}) {
  return {
    phase: 'Z.19',
    foundation_phase: 'Z.18',
    layer: 'runtime-cognitive-composition-engine',
    cognitive_runtime: flags.isCognitiveRuntimeEnabled(),
    block_registry: flags.isCognitiveBlockRegistryEnabled(),
    composition_shadow: flags.isCognitiveCompositionShadowEnabled(),
    semantic_observability: flags.isSemanticDeliveryObservabilityEnabled(),
    validation: flags.isCognitiveRuntimeValidationEnabled(),
    composition_engine: flagsZ19.isCompositionEngineEnabled(),
    quality_cockpit_pilot: flagsZ19.qualityCockpitPilotMode(),
    quality_cockpit_shadow: flagsZ19.isQualityCockpitShadowActive(),
    specialized_delivery_mode: flagsZ21.specializedDeliveryMode(),
    kpi_domain_adapter: flagsZ21.isKpiDomainAdapterEnabled(),
    registry_stats: registry.getRegistryStats(),
    auto_compose_cockpit: false,
    replace_dashboard: false,
    auto_remediate: false,
    tenant_id: ctx.tenant_id
  };
}

async function applyCognitiveFoundationToDashboard(user = {}, payload = {}, ctx = {}) {
  const active =
    flags.isSemanticDeliveryObservabilityEnabled() ||
    flags.isCognitiveRuntimeEnabled() ||
    flags.isCognitiveCompositionShadowEnabled() ||
    ctx.force_cognitive_observability === true;

  if (!active) {
    return {
      payload,
      cognitive_runtime_report: {
        phase: 'Z.18',
        observability_skipped: true,
        reason: 'cognitive_runtime_off'
      }
    };
  }

  const shadowPlan = resolveShadowCompositionPlan(user, payload, {
    ...ctx,
    tenant_id: user?.company_id
  });

  const observability = buildCognitiveObservabilityReport(user, payload, {
    ...ctx,
    composition_gap: shadowPlan.composition_gap
  });

  let validation = null;
  if (flags.isCognitiveRuntimeValidationEnabled() || ctx.force_validation) {
    validation = validateRuntimeComposition(shadowPlan, {
      domain_axis: shadowPlan.domain_axis,
      hierarchy_tier: shadowPlan.hierarchy_tier,
      profile_code: shadowPlan.profile_code
    });
  }

  let qualityPilot = null;
  let cockpitComparison = null;
  if (flagsZ19.isQualityCockpitShadowActive() || flagsZ19.isCompositionObservabilityEnabled()) {
    qualityPilot = await runQualityCockpitPilot(user, payload, {
      ...ctx,
      tenant_id: user?.company_id
    });
    if (qualityPilot?.shadow_cognitive_cockpit && !qualityPilot.pilot_skipped) {
      cockpitComparison = compareGenericVsSpecialized(
        payload,
        qualityPilot.shadow_cognitive_cockpit,
        qualityPilot.composition_score
      );
    }
  }

  const report = {
    ...observability,
    shadow_composition_full: shadowPlan.shadow_skipped ? null : shadowPlan,
    runtime_validation: validation,
    foundation_status: getCognitiveRuntimeStatus({ tenant_id: user?.company_id }),
    ...(qualityPilot && !qualityPilot.pilot_skipped
      ? {
          quality_cockpit_pilot: {
            pilot_id: qualityPilot.pilot_id,
            mode: 'shadow_only',
            shadow_cognitive_cockpit: qualityPilot.shadow_cognitive_cockpit,
            cockpit_comparison: qualityPilot.cockpit_comparison || cockpitComparison,
            composition_score: qualityPilot.composition_score,
            semantic_validation: qualityPilot.semantic_validation,
            recommended_block_ids: qualityPilot.recommended_block_ids,
            engine_bridge: qualityPilot.engine_bridge,
            enrichment_phase: qualityPilot.enrichment_phase
          }
        }
      : qualityPilot?.pilot_skipped
        ? { quality_cockpit_pilot: { skipped: true, reason: qualityPilot.reason } }
        : {})
  };

  if (
    flags.isSemanticDeliveryObservabilityEnabled() &&
    observability.semantic_delivery?.cognitive_composition_ready
  ) {
    logPhaseZ18('COGNITIVE_FOUNDATION_READY', {
      tenant_id: user?.company_id,
      profile: payload.profile_code,
      domain: shadowPlan.domain_axis,
      recommended_blocks: shadowPlan.recommended_block_ids?.length
    });
  }

  let finalPayload = payload;
  let specializedDelivery = null;

  if (
    (flagsZ21.isSpecializedDeliveryEnrichActive() || flagsZ21.isSpecializedDeliveryShadowCompare()) &&
    qualityPilot &&
    !qualityPilot.pilot_skipped
  ) {
    const z21 = await applyControlledEnrichment(user, payload, ctx, qualityPilot);
    if (z21.payload) finalPayload = z21.payload;
    specializedDelivery = z21.specialized_delivery || z21.specialized_delivery_preview || null;
    if (z21.specialized_delivery_preview) {
      report.specialized_delivery_preview = z21.specialized_delivery_preview;
    }
  }

  if (specializedDelivery) {
    report.specialized_delivery = specializedDelivery;
    report.phase_stack = 'Z.18-Z.21';
  }

  return {
    payload: finalPayload,
    cognitive_runtime_report: report
  };
}

async function applySpecializedKpiEnrichment(user = {}, kpis = [], ctx = {}) {
  if (!flagsZ21.isKpiDomainAdapterEnabled() && !flagsZ21.isSpecializedDeliveryEnrichActive()) {
    return { kpis, kpi_enrichment: { applied: false, reason: 'kpi_adapter_off' } };
  }

  let qualityPilot = ctx.quality_pilot;
  if (!qualityPilot) {
    qualityPilot = await runQualityCockpitPilot(
      user,
      {
        profile_code: ctx.profile_code,
        functional_area: ctx.functional_area || 'quality',
        functional_axis: ctx.functional_axis || 'quality'
      },
      ctx
    );
  }

  return enrichKpiChannel(user, kpis, ctx, qualityPilot);
}

function listBlocksForDomain(domain) {
  return registry.listBlocksByDomain(domain);
}

function getBlock(id) {
  return registry.getBlockById(id);
}

module.exports = {
  getCognitiveRuntimeStatus,
  applyCognitiveFoundationToDashboard,
  applySpecializedKpiEnrichment,
  applyControlledEnrichment,
  listBlocksForDomain,
  getBlock,
  getRegistryStats: registry.getRegistryStats
};
