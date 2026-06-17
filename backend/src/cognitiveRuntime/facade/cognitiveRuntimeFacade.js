'use strict';

const flags = require('../config/phaseZ18FeatureFlags');
const flagsZ19 = require('../config/phaseZ19FeatureFlags');
const flagsZ21 = require('../config/phaseZ21FeatureFlags');
const flagsZ22 = require('../config/phaseZ22FeatureFlags');
const flagsZ23 = require('../config/phaseZ23FeatureFlags');
const flagsZ24 = require('../config/phaseZ24FeatureFlags');
const flagsZ25 = require('../config/phaseZ25FeatureFlags');
const { runSafetyCockpitPilot } = require('../pilot/safetyCockpitPilot');
const { applySafetyControlledRenderPromotion } = require('../renderPromotion/safety/safetyControlledRenderRuntime');
const { applySafetyCockpitConsolidation } = require('../domains/sst/runtime/safetyCockpitConsolidationRuntime');
const flagsZ26 = require('../config/phaseZ26FeatureFlags');
const { runHrCockpitPilot } = require('../pilot/hrCockpitPilot');
const { applyHrControlledRenderPromotion } = require('../renderPromotion/hr/hrControlledRenderRuntime');
const { applyHrCockpitConsolidation } = require('../domains/hr/runtime/hrCockpitConsolidationRuntime');
const flagsZP0 = require('../config/phaseZP0FeatureFlags');
const { runProductionCockpitPilot } = require('../pilot/productionCockpitPilot');
const { applyProductionControlledRenderPromotion } = require('../renderPromotion/production/productionControlledRenderRuntime');
const { applyProductionCockpitConsolidation } = require('../domains/production/runtime/productionCockpitConsolidationRuntime');
const flagsP1Env = require('../config/phaseP1EnvironmentalFeatureFlags');
const flagsZ27 = require('../config/phaseZ27FeatureFlags');
const flagsZ28 = require('../config/phaseZ28FeatureFlags');
const { applyAdaptiveOrchestration } = require('../adaptive/adaptiveOrchestrationFacade');
const { emitOrchestrationObservability } = require('../adaptive/observability/orchestrationObservability');
const flagsZ29 = require('../config/phaseZ29FeatureFlags');
const { applyGovernanceLearning } = require('../learning/governanceLearningFacade');
const { emitLearningObservability } = require('../learning/observability/learningObservability');
const { runEnvironmentalCockpitPilot } = require('../pilot/environmentalCockpitPilot');
const { applyEnvironmentalControlledRenderPromotion } = require('../renderPromotion/environmental/environmentalControlledRenderRuntime');
const { applyEnvironmentalCockpitConsolidation } = require('../domains/environmental/runtime/environmentalCockpitConsolidationRuntime');
const flagsZM1 = require('../config/phaseZM1FeatureFlags');
const { runMaintenanceCockpitPilot } = require('../pilot/maintenanceCockpitPilot');
const { applyMaintenanceControlledRenderPromotion } = require('../renderPromotion/maintenance/maintenanceControlledRenderRuntime');
const { applyMaintenanceCockpitConsolidation } = require('../domains/maintenance/runtime/maintenanceCockpitConsolidationRuntime');
const { runExecutiveCockpitPilot } = require('../pilot/executiveCockpitPilot');
const { applyExecutiveControlledRenderPromotion } = require('../renderPromotion/executive/executiveControlledRenderRuntime');
const { applyExecutiveBoardroomConsolidation } = require('../domains/executive/runtime/executiveCockpitConsolidationRuntime');
const { applyControlledEnrichment, enrichKpiChannel } = require('../domainAdapters/runtime/controlledSpecializationRuntime');
const { applyControlledRenderPromotion } = require('../renderPromotion/runtime/controlledRenderPromotionRuntime');
const { applyCognitiveCockpitConsolidation } = require('../cockpitConsolidation/runtime/cognitiveCockpitConsolidator');
const { logPhaseZ18 } = require('../phaseZ18Logger');
const registry = require('../registry/cognitiveBlockRegistry');
const { buildCognitiveObservabilityReport } = require('../observability/cognitiveObservability');
const { resolveShadowCompositionPlan } = require('../composition/compositionShadowResolver');
const { validateRuntimeComposition } = require('../validation/runtimeCompositionValidator');
const { runQualityCockpitPilot } = require('../pilot/qualityCockpitPilot');
const { compareGenericVsSpecialized } = require('../pilot/qualityCockpitCompare');

function getCognitiveRuntimeStatus(ctx = {}) {
  return {
    phase: 'Z.24',
    foundation_phase: 'Z.18',
    layer: 'multi-domain-cognitive-foundation',
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
    render_promotion_mode: flagsZ22.renderPromotionMode(),
    quality_render_pilot: flagsZ22.isQualityRenderPromotionPilot(),
    specialized_cockpit_mode: flagsZ23.specializedCockpitMode(),
    quality_native_cockpit: flagsZ23.isQualityNativeCockpitPilot(),
    multi_domain_foundation: flagsZ24.multiDomainFoundationMode(),
    cognitive_orchestration: flagsZ24.isCognitiveOrchestrationEnabled(),
    semantic_domain_runtime: flagsZ24.isSemanticDomainRuntimeEnabled(),
    sst_native_cockpit: flagsZ25.sstNativeCockpitMode(),
    safety_cognitive_runtime: process.env.IMPETUS_SAFETY_COGNITIVE_RUNTIME || 'off',
    safety_render_promotion: process.env.IMPETUS_SAFETY_RENDER_PROMOTION || 'off',
    hr_native_cockpit: flagsZ26.hrNativeCockpitMode(),
    hr_cognitive_runtime: process.env.IMPETUS_HR_COGNITIVE_RUNTIME || 'off',
    registry_stats: registry.getRegistryStats(),
    registry_consolidation: (() => {
      try {
        const crFlags = require('../../cognitiveRegistry/consolidation/cognitiveRegistryConsolidationFlags');
        if (!crFlags.isConsolidationActive()) return { active: false };
        const unifiedCr = require('../../cognitiveRegistry/consolidation/unifiedCognitiveRegistry');
        return { active: true, mode: crFlags.consolidationMode(), health: unifiedCr.getHealth() };
      } catch (_e) {
        return { active: false };
      }
    })(),
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

  let renderPromotion = null;
  if (
    (flagsZ22.isRenderPromotionControlled() || flagsZ22.isRenderPromotionShadowCompare()) &&
    qualityPilot &&
    !qualityPilot.pilot_skipped
  ) {
    const z22 = applyControlledRenderPromotion(
      user,
      finalPayload,
      {
        ...ctx,
        z21_enriched: specializedDelivery?.promotion_applied === true,
        tenant_id: user?.company_id
      },
      qualityPilot
    );
    if (z22.payload) finalPayload = z22.payload;
    renderPromotion = z22.cognitive_render_promotion || z22.cognitive_render_promotion_preview || null;
    if (z22.cognitive_render_promotion_preview) {
      report.cognitive_render_promotion_preview = z22.cognitive_render_promotion_preview;
    }
  }

  if (renderPromotion) {
    report.cognitive_render_promotion = renderPromotion;
    report.phase_stack = specializedDelivery ? 'Z.18-Z.22' : 'Z.18-Z.19-Z.22';
  }

  let specializedCockpit = null;
  if (
    (flagsZ23.isSpecializedCockpitActive() || flagsZ23.isSpecializedCockpitShadow()) &&
    qualityPilot &&
    !qualityPilot.pilot_skipped
  ) {
    const z23 = await applyCognitiveCockpitConsolidation(
      user,
      finalPayload,
      {
        ...ctx,
        z22_render_promoted: renderPromotion?.promotion_applied === true,
        z21_enriched: specializedDelivery?.promotion_applied === true,
        tenant_id: user?.company_id
      },
      qualityPilot
    );
    if (z23.payload) finalPayload = z23.payload;
    specializedCockpit = z23.specialized_cockpit_runtime || z23.specialized_cockpit_preview || null;
    if (z23.specialized_cockpit_preview) {
      report.specialized_cockpit_preview = z23.specialized_cockpit_preview;
    }
  }

  if (specializedCockpit) {
    report.specialized_cockpit_runtime = specializedCockpit;
    report.cockpit_cognitive_health = specializedCockpit.cognitive_health || null;
    report.phase_stack = renderPromotion ? 'Z.18-Z.23' : 'Z.18-Z.19-Z.23';
  }

  let multiDomainFoundation = null;
  if (flagsZ24.isMultiDomainActive() || flagsZ24.isMultiDomainShadow() || ctx.force_multi_domain) {
    try {
      const { orchestrateCockpitComposition } = require('../domainFoundation/orchestration/cognitiveOrchestrationEngine');
      const { computeMultiDomainCognitiveHealth } = require('../domainFoundation/observability/cognitiveCompositionHealth');
      const { resolveOperationalFocus } = require('../domainFoundation/orchestration/operationalFocusResolver');

      const z24 = orchestrateCockpitComposition(user, finalPayload, {
        ...ctx,
        profile_code: finalPayload.profile_code || ctx.profile_code,
        functional_area: finalPayload.functional_area || ctx.functional_area,
        domain_axis: shadowPlan?.domain_axis || ctx.domain_axis,
        force_orchestration: flagsZ24.isMultiDomainActive() || ctx.force_multi_domain
      });

      if (z24.ok) {
        const health = computeMultiDomainCognitiveHealth(z24);
        const focus = resolveOperationalFocus(z24.orchestrated_blocks || [], z24.blended_weights || {});

        multiDomainFoundation = {
          phase: 'Z.24',
          foundation_active: true,
          domain: z24.domain,
          domain_label: z24.domain_label,
          cockpit_ready: z24.cockpit_ready,
          block_count: z24.block_count,
          blended_weights: z24.blended_weights,
          semantic_fidelity: z24.semantic_fidelity,
          isolation: z24.isolation,
          cognitive_blocks: (z24.orchestrated_blocks || []).map((b) => ({
            block_id: b.block_id,
            label: b.label,
            semantic_layer: b.semantic_layer,
            priority: b.orchestration_priority,
            weight: b.balanced_score ?? b.domain_weight,
            relevance: b.relevance
          })),
          multi_domain_cognitive_health: health,
          operational_focus: focus,
          ready_domains: z24.ready_domains
        };

        if (flagsZ24.isMultiDomainActive()) {
          finalPayload.multi_domain_foundation = multiDomainFoundation;
          finalPayload.cognitive_blocks = multiDomainFoundation.cognitive_blocks;
        }
      } else {
        multiDomainFoundation = { phase: 'Z.24', foundation_active: false, reason: z24.reason };
      }
    } catch (z24Err) {
      multiDomainFoundation = { phase: 'Z.24', foundation_active: false, reason: 'z24_error', error: z24Err.message };
    }
  }

  if (multiDomainFoundation) {
    report.multi_domain_foundation = multiDomainFoundation;
    report.multi_domain_cognitive_health = multiDomainFoundation.multi_domain_cognitive_health || null;
    report.phase_stack = (report.phase_stack || 'Z.18') + '-Z.24';
  }

  let safetyPilot = null;
  if (flagsZ25.isSafetyCognitiveRuntimeActive() || flagsZ25.isSafetyCognitiveRuntimeShadow()) {
    safetyPilot = await runSafetyCockpitPilot(user, finalPayload, {
      ...ctx,
      tenant_id: user?.company_id
    });
    if (safetyPilot && !safetyPilot.pilot_skipped) {
      report.safety_cockpit_pilot = {
        pilot_id: safetyPilot.pilot_id,
        shadow_cognitive_cockpit: safetyPilot.shadow_cognitive_cockpit,
        engine_bridge: safetyPilot.engine_bridge,
        composition_score: safetyPilot.composition_score
      };
    }
  }

  if (
    flagsZ25.isSafetyRenderPromotionControlled() &&
    safetyPilot &&
    !safetyPilot.pilot_skipped
  ) {
    const z25r = applySafetyControlledRenderPromotion(user, finalPayload, { ...ctx, tenant_id: user?.company_id }, safetyPilot);
    if (z25r.payload) finalPayload = z25r.payload;
    if (z25r.cognitive_render_promotion) {
      report.safety_render_promotion = z25r.cognitive_render_promotion;
      report.phase_stack = (report.phase_stack || 'Z.18') + '-Z.25-render';
    }
  }

  let sstCognitiveRuntime = null;
  if (flagsZ25.isSstNativeCockpitPilot() && safetyPilot && !safetyPilot.pilot_skipped) {
    const z25c = await applySafetyCockpitConsolidation(
      user,
      finalPayload,
      { ...ctx, z25_render_promoted: true, tenant_id: user?.company_id },
      safetyPilot
    );
    if (z25c.payload) finalPayload = z25c.payload;
    sstCognitiveRuntime = z25c.sst_cognitive_runtime || z25c.sst_cockpit_preview || null;
    if (sstCognitiveRuntime) {
      report.sst_cognitive_runtime = sstCognitiveRuntime;
      report.safety_cognitive_health = sstCognitiveRuntime.safety_cognitive_health || null;
      report.phase_stack = (report.phase_stack || 'Z.18') + '-Z.25';
    }
  }

  let environmentalPilot = null;
  if (flagsP1Env.isEnvironmentalCognitiveRuntimeActive() || flagsP1Env.isEnvironmentalCognitiveRuntimeShadow()) {
    environmentalPilot = await runEnvironmentalCockpitPilot(user, finalPayload, { ...ctx, tenant_id: user?.company_id });
    if (environmentalPilot && !environmentalPilot.pilot_skipped) {
      report.environmental_cockpit_pilot = {
        pilot_id: environmentalPilot.pilot_id,
        engine_bridge: environmentalPilot.engine_bridge,
        composition_score: environmentalPilot.composition_score
      };
    }
  }

  if (flagsP1Env.isEnvironmentalRenderPromotionControlled() && environmentalPilot && !environmentalPilot.pilot_skipped) {
    const zenvr = applyEnvironmentalControlledRenderPromotion(user, finalPayload, { ...ctx, tenant_id: user?.company_id }, environmentalPilot);
    if (zenvr.payload) finalPayload = zenvr.payload;
    if (zenvr.cognitive_render_promotion) {
      report.environmental_render_promotion = zenvr.cognitive_render_promotion;
      report.phase_stack = (report.phase_stack || 'Z.18') + '-P1ENV-render';
    }
  }

  let environmentalCognitiveRuntime = null;
  if (flagsP1Env.isEnvironmentalNativeCockpitPilot() && environmentalPilot && !environmentalPilot.pilot_skipped) {
    const zenvc = await applyEnvironmentalCockpitConsolidation(
      user,
      finalPayload,
      { ...ctx, p1env_render_promoted: true, tenant_id: user?.company_id },
      environmentalPilot
    );
    if (zenvc.payload) finalPayload = zenvc.payload;
    environmentalCognitiveRuntime = zenvc.environmental_cognitive_runtime || null;
    if (environmentalCognitiveRuntime) {
      report.environmental_cognitive_runtime = environmentalCognitiveRuntime;
      report.phase_stack = (report.phase_stack || 'Z.18') + '-P1ENV';
    }
  }

  let maintenancePilot = null;
  if (flagsZM1.isMaintenanceCognitiveRuntimeActive() || flagsZM1.isMaintenanceCognitiveRuntimeShadow()) {
    maintenancePilot = await runMaintenanceCockpitPilot(user, finalPayload, { ...ctx, tenant_id: user?.company_id });
    if (maintenancePilot && !maintenancePilot.pilot_skipped) {
      report.maintenance_cockpit_pilot = {
        pilot_id: maintenancePilot.pilot_id,
        engine_bridge: maintenancePilot.engine_bridge,
        composition_score: maintenancePilot.composition_score
      };
    }
  }

  if (flagsZM1.isMaintenanceRenderPromotionControlled() && maintenancePilot && !maintenancePilot.pilot_skipped) {
    const zm1r = applyMaintenanceControlledRenderPromotion(
      user,
      finalPayload,
      { ...ctx, tenant_id: user?.company_id },
      maintenancePilot
    );
    if (zm1r.payload) finalPayload = zm1r.payload;
    if (zm1r.cognitive_render_promotion) {
      report.maintenance_render_promotion = zm1r.cognitive_render_promotion;
      report.phase_stack = (report.phase_stack || 'Z.18') + '-Z.M1-render';
    }
  }

  let maintenanceCognitiveRuntime = null;
  if (flagsZM1.isMaintenanceNativeCockpitPilot() && maintenancePilot && !maintenancePilot.pilot_skipped) {
    const zm1c = await applyMaintenanceCockpitConsolidation(
      user,
      finalPayload,
      { ...ctx, zm1_render_promoted: true, tenant_id: user?.company_id },
      maintenancePilot
    );
    if (zm1c.payload) finalPayload = zm1c.payload;
    maintenanceCognitiveRuntime = zm1c.maintenance_cognitive_runtime || zm1c.maintenance_cockpit_preview || null;
    if (maintenanceCognitiveRuntime) {
      report.maintenance_cognitive_runtime = maintenanceCognitiveRuntime;
      report.maintenance_cognitive_health = maintenanceCognitiveRuntime.maintenance_cognitive_health || null;
      report.phase_stack = (report.phase_stack || 'Z.18') + '-Z.M1';
    }
  }

  let productionPilot = null;
  if (flagsZP0.isProductionCognitiveRuntimeActive() || flagsZP0.isProductionCognitiveRuntimeShadow()) {
    productionPilot = await runProductionCockpitPilot(user, finalPayload, { ...ctx, tenant_id: user?.company_id });
    if (productionPilot && !productionPilot.pilot_skipped) {
      report.production_cockpit_pilot = {
        pilot_id: productionPilot.pilot_id,
        shadow_cognitive_cockpit: productionPilot.shadow_cognitive_cockpit,
        engine_bridge: productionPilot.engine_bridge,
        composition_score: productionPilot.composition_score
      };
    }
  }

  if (flagsZP0.isProductionRenderPromotionControlled() && productionPilot && !productionPilot.pilot_skipped) {
    const zpr = applyProductionControlledRenderPromotion(
      user,
      finalPayload,
      { ...ctx, tenant_id: user?.company_id },
      productionPilot
    );
    if (zpr.payload) finalPayload = zpr.payload;
    if (zpr.cognitive_render_promotion) {
      report.production_render_promotion = zpr.cognitive_render_promotion;
      report.phase_stack = (report.phase_stack || 'Z.18') + '-Z.P0-render';
    }
  }

  let productionCognitiveRuntime = null;
  if (flagsZP0.isProductionNativeCockpitPilot() && productionPilot && !productionPilot.pilot_skipped) {
    const zpc = await applyProductionCockpitConsolidation(
      user,
      finalPayload,
      { ...ctx, zp0_render_promoted: true, tenant_id: user?.company_id },
      productionPilot
    );
    if (zpc.payload) finalPayload = zpc.payload;
    productionCognitiveRuntime = zpc.production_cognitive_runtime || zpc.production_cockpit_preview || null;
    if (productionCognitiveRuntime) {
      report.production_cognitive_runtime = productionCognitiveRuntime;
      report.production_cognitive_health = productionCognitiveRuntime.production_cognitive_health || null;
      report.phase_stack = (report.phase_stack || 'Z.18') + '-Z.P0';
    }
  }

  let hrPilot = null;
  if (flagsZ26.isHrCognitiveRuntimeActive() || flagsZ26.isHrCognitiveRuntimeShadow()) {
    hrPilot = await runHrCockpitPilot(user, finalPayload, { ...ctx, tenant_id: user?.company_id });
    if (hrPilot && !hrPilot.pilot_skipped) {
      report.hr_cockpit_pilot = {
        pilot_id: hrPilot.pilot_id,
        shadow_cognitive_cockpit: hrPilot.shadow_cognitive_cockpit,
        engine_bridge: hrPilot.engine_bridge,
        composition_score: hrPilot.composition_score
      };
    }
  }

  if (flagsZ26.isHrRenderPromotionControlled() && hrPilot && !hrPilot.pilot_skipped) {
    const z26r = applyHrControlledRenderPromotion(user, finalPayload, { ...ctx, tenant_id: user?.company_id }, hrPilot);
    if (z26r.payload) finalPayload = z26r.payload;
    if (z26r.cognitive_render_promotion) {
      report.hr_render_promotion = z26r.cognitive_render_promotion;
      report.phase_stack = (report.phase_stack || 'Z.18') + '-Z.26-render';
    }
  }

  let hrCognitiveRuntime = null;
  if (flagsZ26.isHrNativeCockpitPilot() && hrPilot && !hrPilot.pilot_skipped) {
    const z26c = await applyHrCockpitConsolidation(
      user,
      finalPayload,
      { ...ctx, z26_render_promoted: true, tenant_id: user?.company_id },
      hrPilot
    );
    if (z26c.payload) finalPayload = z26c.payload;
    hrCognitiveRuntime = z26c.hr_cognitive_runtime || z26c.hr_cockpit_preview || null;
    if (hrCognitiveRuntime) {
      report.hr_cognitive_runtime = hrCognitiveRuntime;
      report.hr_cognitive_health = hrCognitiveRuntime.hr_cognitive_health || null;
      report.phase_stack = (report.phase_stack || 'Z.18') + '-Z.26';
    }
  }

  let executivePilot = null;
  if (flagsZ27.isExecutiveCognitiveRuntimeActive() || flagsZ27.isExecutiveCognitiveRuntimeShadow()) {
    executivePilot = await runExecutiveCockpitPilot(user, finalPayload, { ...ctx, tenant_id: user?.company_id });
    if (executivePilot && !executivePilot.pilot_skipped) {
      report.executive_cockpit_pilot = {
        pilot_id: executivePilot.pilot_id,
        engine_bridge: executivePilot.engine_bridge,
        composition_score: executivePilot.composition_score
      };
    }
  }

  if (flagsZ27.isExecutiveRenderPromotionControlled() && executivePilot && !executivePilot.pilot_skipped) {
    const z27r = applyExecutiveControlledRenderPromotion(user, finalPayload, { ...ctx, tenant_id: user?.company_id }, executivePilot);
    if (z27r.payload) finalPayload = z27r.payload;
    if (z27r.cognitive_render_promotion) {
      report.executive_render_promotion = z27r.cognitive_render_promotion;
      report.phase_stack = (report.phase_stack || 'Z.18') + '-Z.27-render';
    }
  }

  let executiveCognitiveRuntime = null;
  if (flagsZ27.isExecutiveBoardroomPilot() && executivePilot && !executivePilot.pilot_skipped) {
    const z27c = await applyExecutiveBoardroomConsolidation(
      user,
      finalPayload,
      { ...ctx, z27_render_promoted: true, tenant_id: user?.company_id },
      executivePilot
    );
    if (z27c.payload) finalPayload = z27c.payload;
    executiveCognitiveRuntime = z27c.executive_cognitive_runtime || null;
    if (executiveCognitiveRuntime) {
      report.executive_cognitive_runtime = executiveCognitiveRuntime;
      report.phase_stack = (report.phase_stack || 'Z.18') + '-Z.27';
    }
  }

  if (flagsZ28.isAdaptiveOrchestrationEnabled() || ctx.force_adaptive_orchestration) {
    const z28 = applyAdaptiveOrchestration(user, finalPayload, { ...ctx, tenant_id: user?.company_id });
    if (z28.payload) finalPayload = z28.payload;
    if (z28.adaptive_orchestration) {
      report.adaptive_orchestration = z28.adaptive_orchestration;
      report.adaptive_orchestration_report = z28.report || z28.adaptive_orchestration_shadow || null;
      report.phase_stack = (report.phase_stack || 'Z.18') + '-Z.28';
      emitOrchestrationObservability('ADAPTIVE_ORCHESTRATION_APPLIED', {
        tenant_id: user?.company_id,
        adaptation_recommended: z28.adaptive_orchestration.adaptation_recommended,
        auto_mutation: z28.adaptive_orchestration.auto_mutation_applied
      });
    }
  }

  if (flagsZ29.isGovernanceLearningEnabled() || ctx.force_governance_learning) {
    const z29 = applyGovernanceLearning(user, finalPayload, { ...ctx, tenant_id: user?.company_id });
    if (z29.payload) finalPayload = z29.payload;
    if (z29.governance_learning) {
      report.governance_learning = z29.governance_learning;
      report.governance_learning_report = z29.report || null;
      report.phase_stack = (report.phase_stack || 'Z.18') + '-Z.29';
      emitLearningObservability('GOVERNANCE_LEARNING_APPLIED', {
        tenant_id: user?.company_id,
        patterns: z29.governance_learning.patterns_detected?.length,
        auto_mutation: z29.governance_learning.auto_mutation_applied
      });
    }
  }

  // M1.16 — payload consumidor imutável em quality shadow_only (metadados ficam no report)
  if (report.quality_cockpit_pilot?.mode === 'shadow_only') {
    finalPayload = payload;
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
  applyControlledRenderPromotion,
  applyCognitiveCockpitConsolidation,
  listBlocksForDomain,
  getBlock,
  getRegistryStats: registry.getRegistryStats
};
