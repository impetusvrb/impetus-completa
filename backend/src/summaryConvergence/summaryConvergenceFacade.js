'use strict';

const flags = require('./config/phaseZ8FeatureFlags');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { getTenantEnforcementState } = require('../contextualActivation/tenantEnforcementState');
const { runSummaryRuntimeConvergenceEngine } = require('./summaryRuntimeConvergenceEngine');
const { assureExecutiveNarrative } = require('./executiveNarrativeAssurance');
const { assureOperationalNarrative } = require('./operationalNarrativeAssurance');
const { assureManagerialNarrative } = require('./managerialNarrativeAssurance');
const { balanceStrategicNarrative } = require('./strategicNarrativeBalancer');
const { assessNarrativeOperationalIntegrity } = require('./narrativeOperationalIntegrity');
const { detectSummaryBlindness } = require('../summaryBlindness/summaryBlindnessFacade');
const { stabilizeSummaryDelivery } = require('../summaryDeliveryStabilization/summaryStabilizationFacade');
const { assessSummaryGovernanceHealth } = require('../summaryGovernanceHealth/summaryGovernanceHealthFacade');
const { buildSummaryObservabilityEvolution } = require('../summaryObservabilityEvolution/summaryObservabilityEvolutionFacade');

function isSummaryRuntimeContextActive(tenantId, ctx = {}) {
  if (!isPilotTenant(tenantId) && !ctx.force_summary_convergence) return false;
  const state = getTenantEnforcementState(tenantId);
  return state.channels.menu || state.channels.kpi || ctx.force_summary_convergence === true;
}

function getSummaryConvergenceStatus(ctx = {}) {
  return {
    phase: 'Z.8',
    layer: 'summary-runtime-convergence',
    runtime_convergence: flags.isSummaryRuntimeConvergenceEnabled(),
    narrative_assurance: flags.isSummaryNarrativeAssuranceEnabled(),
    blindness_detection: flags.isSummaryBlindnessDetectionEnabled(),
    governance_health: flags.isSummaryGovernanceHealthEnabled(),
    observability: flags.isSummaryConvergenceObservabilityEnabled(),
    summary_enforcement: false,
    chat_enforcement: false,
    shadow_first: true,
    global_activation: false,
    tenant_id: ctx.tenant_id
  };
}

function applySummaryRuntimeConvergence(user, summaryPayload = {}, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  if (!isSummaryRuntimeContextActive(tenantId, ctx) && !ctx.force_summary_convergence) {
    return {
      payload: summaryPayload,
      summary_runtime_convergence: null,
      summary_narrative_integrity: null,
      summary_governance_health: null
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
    hierarchy_tier: identity.canonical_identity?.hierarchy_tier,
    domain_axis: identity.canonical_identity?.domain_axis,
    functional_axis: identity.canonical_identity?.domain_axis,
    kpis: ctx.kpis || ctx.kpi_runtime_convergence?.kpis || []
  };

  const convergence = runSummaryRuntimeConvergenceEngine(summaryPayload, user, mergedCtx);
  const assurance = {
    executive: assureExecutiveNarrative(summaryPayload, mergedCtx),
    operational: assureOperationalNarrative(summaryPayload, mergedCtx),
    managerial: assureManagerialNarrative(summaryPayload, mergedCtx),
    balance: balanceStrategicNarrative(summaryPayload, user, mergedCtx),
    narrative_assurance_active: flags.isSummaryNarrativeAssuranceEnabled()
  };
  const narrative_integrity = assessNarrativeOperationalIntegrity(summaryPayload, mergedCtx);
  const blindness = detectSummaryBlindness(summaryPayload, mergedCtx);
  const stability = stabilizeSummaryDelivery(summaryPayload, mergedCtx);

  const healthPack = { convergence, blindness, stability, assurance, narrative_integrity, kpi: ctx.kpi_governance_health };
  const governanceHealth = assessSummaryGovernanceHealth(healthPack, mergedCtx);
  const evolution = buildSummaryObservabilityEvolution(tenantId, {
    convergence,
    health: governanceHealth,
    stability,
    kpi_convergence: ctx.kpi_runtime_convergence
  });

  const summary_runtime_convergence = {
    phase: 'Z.8',
    pilot: true,
    tenant_id: tenantId,
    ...convergence,
    assurance,
    blindness,
    stability,
    evolution,
    shadow_first: true,
    recommendation_only: true,
    enforcement_applied: false,
    narrative_rewritten: false,
    narrative_fabricated: false,
    payload_legacy_preserved: true
  };

  const summary_narrative_integrity = {
    phase: 'Z.8',
    ...narrative_integrity,
    assurance,
    stability: stability.stability,
    ambiguous: blindness.ambiguity?.ambiguous
  };

  return {
    payload: summaryPayload,
    summary_runtime_convergence,
    summary_narrative_integrity,
    summary_governance_health: governanceHealth
  };
}

function getSummaryConvergenceReport(user = {}, ctx = {}) {
  return { ok: true, ...applySummaryRuntimeConvergence(user, ctx.summary || ctx, ctx) };
}

module.exports = {
  getSummaryConvergenceStatus,
  applySummaryRuntimeConvergence,
  getSummaryConvergenceReport,
  isSummaryRuntimeContextActive
};
