'use strict';

const flags = require('./config/phaseZ7FeatureFlags');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { isKpiStabilityContextActive } = require('../kpiRuntimeStability/kpiRuntimeStabilityEngine');
const { runKpiRuntimeConvergenceEngine } = require('./kpiRuntimeConvergenceEngine');
const { assureExecutiveVisibility } = require('./executiveVisibilityAssurance');
const { assureOperationalVisibility } = require('./operationalVisibilityAssurance');
const { assureManagerialVisibility } = require('./managerialVisibilityAssurance');
const { assessStrategicOperationalBalance } = require('./strategicOperationalBalance');
const { assureCockpitIntegrity } = require('./cockpitIntegrityAssurance');
const { detectKpiBlindness } = require('../kpiBlindness/kpiBlindnessFacade');
const { runCockpitConvergenceRuntime } = require('../kpiCockpitConsistency/cockpitConvergenceRuntime');
const { assessKpiGovernanceHealth } = require('../kpiGovernanceHealth/kpiGovernanceHealthFacade');
const { buildKpiObservabilityEvolution } = require('../kpiObservabilityEvolution/kpiObservabilityEvolutionFacade');

function getKpiConvergenceStatus(ctx = {}) {
  return {
    phase: 'Z.7',
    layer: 'kpi-runtime-convergence',
    runtime_convergence: flags.isKpiRuntimeConvergenceEnabled(),
    executive_operational_assurance: flags.isExecutiveOperationalAssuranceEnabled(),
    blindness_detection: flags.isKpiBlindnessDetectionEnabled(),
    governance_health: flags.isKpiGovernanceHealthEnabled(),
    observability: flags.isKpiConvergenceObservabilityEnabled(),
    summary_enforcement: false,
    chat_enforcement: false,
    global_activation: false,
    tenant_id: ctx.tenant_id
  };
}

function applyKpiRuntimeConvergence(user, kpis = [], ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  if (!isPilotTenant(tenantId) && !ctx.force_convergence) {
    return {
      kpis,
      kpi_runtime_convergence: null,
      kpi_cockpit_integrity: null,
      kpi_governance_health: null
    };
  }

  if (!isKpiStabilityContextActive(tenantId, ctx) && !ctx.force_convergence) {
    return {
      kpis,
      kpi_runtime_convergence: null,
      kpi_cockpit_integrity: null,
      kpi_governance_health: null,
      reason: 'kpi_stability_context_inactive'
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
    functional_axis: identity.canonical_identity?.domain_axis
  };

  const convergence = runKpiRuntimeConvergenceEngine(kpis, user, mergedCtx);
  mergedCtx.alignment = convergence.alignment;

  const assurance = flags.isExecutiveOperationalAssuranceEnabled()
    ? {
        executive: assureExecutiveVisibility(kpis, mergedCtx),
        operational: assureOperationalVisibility(kpis, mergedCtx),
        managerial: assureManagerialVisibility(kpis, mergedCtx),
        balance: assessStrategicOperationalBalance(kpis, mergedCtx)
      }
    : {
        executive: assureExecutiveVisibility(kpis, mergedCtx),
        operational: assureOperationalVisibility(kpis, mergedCtx),
        managerial: assureManagerialVisibility(kpis, mergedCtx),
        balance: assessStrategicOperationalBalance(kpis, mergedCtx),
        recommendation_only: true
      };

  const blindness = detectKpiBlindness(kpis, mergedCtx);
  const cockpitRuntime = runCockpitConvergenceRuntime(kpis, user, mergedCtx);
  const cockpitIntegrity = assureCockpitIntegrity(kpis, mergedCtx);

  const healthPack = {
    convergence,
    blindness,
    stability: ctx.kpi_runtime_stability,
    quality: ctx.kpi_operational_quality,
    cockpit: cockpitIntegrity
  };
  const governanceHealth = assessKpiGovernanceHealth(healthPack, mergedCtx);
  const evolution = buildKpiObservabilityEvolution(tenantId, {
    kpi_enforcement: ctx.kpi_runtime_enforcement,
    kpi_stability: ctx.kpi_runtime_stability,
    convergence,
    health: governanceHealth
  });

  const kpi_runtime_convergence = {
    phase: 'Z.7',
    pilot: true,
    tenant_id: tenantId,
    ...convergence,
    assurance,
    blindness,
    evolution,
    recommendation_only: !flags.isKpiRuntimeConvergenceEnabled(),
    enforcement_applied: false,
    fabricated: false,
    payload_legacy_preserved: true
  };

  const kpi_cockpit_integrity = {
    phase: 'Z.7',
    ...cockpitRuntime,
    integrity: cockpitIntegrity,
    cockpit_useful: cockpitRuntime.cockpit?.useful !== false
  };

  const kpi_governance_health = governanceHealth;

  return { kpis, kpi_runtime_convergence, kpi_cockpit_integrity, kpi_governance_health };
}

function getKpiConvergenceReport(user = {}, ctx = {}) {
  return { ok: true, ...applyKpiRuntimeConvergence(user, ctx.kpis || [], ctx) };
}

module.exports = {
  getKpiConvergenceStatus,
  applyKpiRuntimeConvergence,
  getKpiConvergenceReport
};
