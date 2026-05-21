'use strict';

const flags = require('./config/phaseZ5FeatureFlags');
const { runTenantKpiEnforcementRuntime, shouldEnforceKpis } = require('./tenantKpiEnforcementRuntime');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');

function getKpiRuntimeEnforcementStatus(ctx = {}) {
  return {
    phase: 'Z.5',
    layer: 'kpi-runtime-enforcement',
    kpi_runtime_enforcement: flags.isKpiRuntimeEnforcementEnabled(),
    tenant_kpi_enforcement: flags.isTenantKpiEnforcementEnabled(),
    kpi_safety: flags.isKpiSafetyValidationEnabled(),
    kpi_targeting: flags.isKpiTargetingStabilizationEnabled(),
    observability: flags.isKpiPilotObservabilityEnabled(),
    summary_enforcement: false,
    chat_enforcement: false,
    global_activation: false,
    tenant_id: ctx.tenant_id
  };
}

function applyKpiRuntimeEnforcement(user, legacyKpis = [], ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  const kpis = Array.isArray(legacyKpis) ? legacyKpis : legacyKpis?.kpis || [];

  if (!isPilotTenant(tenantId) && !ctx.force_kpi_pipeline) {
    return { kpis, kpi_runtime_enforcement: null };
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
    domain_axis: identity.canonical_identity?.domain_axis,
    hierarchy_tier: identity.canonical_identity?.hierarchy_tier,
    functional_axis: identity.canonical_identity?.domain_axis
  };

  let safety = null;
  let targeting = null;
  let observability = null;

  if (flags.isKpiSafetyValidationEnabled() || flags.isKpiPilotObservabilityEnabled()) {
    try {
      const safetyFacade = require('../kpiSafety/kpiSafetyFacade');
      safety = safetyFacade.validateKpiSafety(user, kpis, mergedCtx);
    } catch {
      /* optional */
    }
  }

  const pipeline = runTenantKpiEnforcementRuntime(kpis, user, mergedCtx);

  if (flags.isKpiTargetingStabilizationEnabled()) {
    try {
      const stab = require('../kpiTargetingStabilization/kpiTargetingStabilizationFacade');
      targeting = stab.analyzeKpiTargetingStability(user, pipeline.kpis, {
        ...mergedCtx,
        kpis_before: pipeline.before
      });
    } catch {
      /* optional */
    }
  }

  if (flags.isKpiPilotObservabilityEnabled()) {
    try {
      const obs = require('../kpiPilotObservability/kpiPilotObservabilityFacade');
      observability = obs.consolidateKpiPilotObservability(tenantId, {
        pipeline,
        safety,
        targeting,
        tenant_id: tenantId
      });
    } catch {
      /* optional */
    }
  }

  const responseKpis = pipeline.enforcement_applied ? pipeline.kpis : kpis;

  const kpi_runtime_enforcement = {
    phase: 'Z.5',
    pilot: isPilotTenant(tenantId),
    tenant_id: tenantId,
    enforcement_applied: pipeline.enforcement_applied,
    should_enforce: shouldEnforceKpis(tenantId, mergedCtx),
    pipeline,
    safety,
    targeting,
    observability,
    kpis_before_count: pipeline.before_count ?? kpis.length,
    kpis_after_count: pipeline.after_count ?? responseKpis.length,
    graceful_degradation: true,
    fabricated: false,
    payload_legacy_preserved: !pipeline.enforcement_applied
  };

  return { kpis: responseKpis, kpi_runtime_enforcement };
}

module.exports = {
  getKpiRuntimeEnforcementStatus,
  applyKpiRuntimeEnforcement,
  runTenantKpiEnforcementRuntime,
  shouldEnforceKpis
};
