'use strict';

const flags = require('./config/phaseZ9FeatureFlags');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { getTenantEnforcementState } = require('../contextualActivation/tenantEnforcementState');
const { shouldEnforceSummary, runSummaryEnforcementPipeline } = require('./summaryEnforcementRuntime');
const { superviseTenantSummaryRuntime } = require('./tenantSummaryRuntimeSupervisor');
const { stabilizeSummaryNarrative } = require('../summaryNarrativeStabilization/narrativeStabilizationFacade');
const { assessSummaryUnderdelivery } = require('../summaryUnderdelivery/summaryUnderdeliveryFacade');
const { analyzeSummaryTargetingIntegrity } = require('../summaryTargetingHardening/summaryTargetingIntegrityFacade');
const { assessSummaryDeliveryQuality } = require('../summaryDeliveryQuality/summaryDeliveryQualityFacade');
const { assessSummaryCockpitIntegrity } = require('../summaryCockpitConsistency/summaryCockpitFacade');
const { consolidateSummaryRuntimeObservability } = require('../summaryRuntimeObservability/summaryRuntimeObservabilityFacade');

function isSummaryActivationContextActive(tenantId, ctx = {}) {
  if (!isPilotTenant(tenantId) && !ctx.force_summary_activation) return false;
  const state = getTenantEnforcementState(tenantId);
  return state.channels.summary || state.channels.kpi || ctx.force_summary_activation === true;
}

function getSummaryRuntimeActivationStatus(ctx = {}) {
  return {
    phase: 'Z.9',
    layer: 'summary-runtime-activation',
    runtime_activation: flags.isSummaryRuntimeActivationEnabled(),
    tenant_summary_enforcement: flags.isTenantSummaryEnforcementEnabled(),
    narrative_stabilization: flags.isSummaryNarrativeStabilizationEnabled(),
    targeting_hardening: flags.isSummaryTargetingHardeningEnabled(),
    delivery_quality: flags.isSummaryDeliveryQualityEnabled(),
    observability: flags.isSummaryRuntimeObservabilityEnabled(),
    chat_enforcement: false,
    global_activation: false,
    shadow_first: !flags.isSummaryRuntimeActivationEnabled(),
    tenant_id: ctx.tenant_id
  };
}

function applySummaryRuntimeActivation(user, summaryPayload = {}, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  if (!isSummaryActivationContextActive(tenantId, ctx) && !ctx.force_summary_activation) {
    return {
      payload: summaryPayload,
      summary_runtime_activation: null,
      summary_delivery_quality: null,
      summary_runtime_health: null
    };
  }

  let identity = { canonical_identity: {} };
  try {
    identity = require('../operationalIdentity/operationalIdentityFacade').resolveIdentityForUser(user, ctx);
  } catch {
    /* optional */
  }

  const mergedCtx = {
    ...ctx,
    tenant_id: tenantId,
    canonical_identity: identity.canonical_identity,
    hierarchy_tier: identity.canonical_identity?.hierarchy_tier || ctx.hierarchy_tier,
    domain_axis: identity.canonical_identity?.domain_axis,
    functional_axis: identity.canonical_identity?.domain_axis || ctx.functional_axis,
    kpis: ctx.kpis || []
  };

  let convergence = null;
  try {
    const z8 = require('../summaryConvergence/summaryConvergenceFacade').applySummaryRuntimeConvergence(
      user,
      summaryPayload,
      mergedCtx
    );
    convergence = z8.summary_runtime_convergence;
    mergedCtx.kpi_runtime_convergence = ctx.kpi_runtime_convergence;
  } catch {
    /* optional */
  }

  const blindness = require('../summaryBlindness/summaryBlindnessFacade').detectSummaryBlindness(
    summaryPayload,
    mergedCtx
  );
  const stability = stabilizeSummaryNarrative(summaryPayload, mergedCtx);
  const underdelivery = assessSummaryUnderdelivery(summaryPayload, mergedCtx);
  const targeting = analyzeSummaryTargetingIntegrity(summaryPayload, mergedCtx);
  const deliveryQuality = assessSummaryDeliveryQuality(summaryPayload, mergedCtx);
  const cockpit = assessSummaryCockpitIntegrity(summaryPayload, mergedCtx);
  const supervision = superviseTenantSummaryRuntime(tenantId, user, mergedCtx);

  const observabilityPack = {
    convergence,
    blindness,
    stability: stability.stability,
    underdelivery,
    targeting,
    deliveryQuality,
    cockpit,
    ctx: mergedCtx,
    force: ctx.force_summary_activation
  };
  const observability = consolidateSummaryRuntimeObservability(tenantId, observabilityPack);

  let payload = { ...summaryPayload };
  let pipeline = { enforcement_applied: false, shadow_only: true };

  if (shouldEnforceSummary(tenantId, mergedCtx)) {
    pipeline = runSummaryEnforcementPipeline(payload, user, mergedCtx);
    if (pipeline.enforcement_applied) payload = pipeline.payload;
  }

  const summary_runtime_activation = {
    phase: 'Z.9',
    pilot: isPilotTenant(tenantId),
    tenant_id: tenantId,
    summary_channel_active: getTenantEnforcementState(tenantId).channels.summary,
    enforcement_applied: pipeline.enforcement_applied,
    should_enforce: shouldEnforceSummary(tenantId, mergedCtx),
    supervision,
    stability,
    underdelivery,
    targeting,
    blindness,
    cockpit,
    convergence,
    pipeline,
    chat_enforcement: false,
    narrative_fabricated: false,
    narrative_rewritten: false,
    recommendation_first: !pipeline.enforcement_applied
  };

  const summary_delivery_quality = {
    phase: 'Z.9',
    ...deliveryQuality,
    observability_linked: !!observability
  };

  const summary_runtime_health = observability?.health || {
    health_score: 0.5,
    healthy: true,
    graceful_degradation: true
  };

  return {
    payload,
    summary_runtime_activation,
    summary_delivery_quality,
    summary_runtime_health,
    summary_runtime_observability: observability
  };
}

function getSummaryRuntimeActivationReport(user = {}, ctx = {}) {
  return { ok: true, ...applySummaryRuntimeActivation(user, ctx.summary || ctx, ctx) };
}

module.exports = {
  getSummaryRuntimeActivationStatus,
  applySummaryRuntimeActivation,
  getSummaryRuntimeActivationReport,
  isSummaryActivationContextActive,
  shouldEnforceSummary
};
