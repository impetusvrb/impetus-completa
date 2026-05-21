'use strict';

const flags = require('./config/phaseZ6FeatureFlags');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');
const { runKpiRuntimeStabilityEngine } = require('./kpiRuntimeStabilityEngine');
const { buildKpiRuntimeTimeline } = require('./kpiRuntimeTimeline');
const { assessKpiRuntimeRollbackReadiness } = require('./kpiRuntimeRollbackReadiness');

function getKpiRuntimeStabilityStatus(ctx = {}) {
  return {
    phase: 'Z.6',
    layer: 'kpi-runtime-stability',
    visibility_stabilization: flags.isKpiVisibilityStabilizationEnabled(),
    underdelivery_hardening: flags.isKpiUnderdeliveryHardeningEnabled(),
    targeting_hardening: flags.isKpiTargetingHardeningEnabled(),
    dashboard_stabilization: flags.isKpiDashboardStabilizationEnabled(),
    observability: flags.isKpiRuntimeStabilityObservabilityEnabled(),
    summary_enforcement: false,
    chat_enforcement: false,
    global_activation: false,
    tenant_id: ctx.tenant_id
  };
}

function applyKpiRuntimeStability(user, kpis = [], ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  if (!isPilotTenant(tenantId) && !ctx.force_stability) {
    return {
      kpis,
      kpi_runtime_stability: null,
      kpi_visibility_integrity: null,
      kpi_operational_quality: null
    };
  }

  const engine = runKpiRuntimeStabilityEngine(kpis, user, ctx);
  const responseKpis = engine.stability_applied ? engine.kpis : kpis;

  const kpi_runtime_stability = {
    phase: 'Z.6',
    pilot: true,
    tenant_id: tenantId,
    stability_applied: engine.stability_applied,
    health: engine.health,
    convergence: engine.convergence,
    underdelivery: engine.underdelivery,
    targeting: engine.targeting,
    dashboard: engine.dashboard,
    timeline: buildKpiRuntimeTimeline(tenantId, {
      enforcement: ctx.kpi_enforcement,
      stability_applied: engine.stability_applied
    }),
    rollback: assessKpiRuntimeRollbackReadiness(tenantId, {
      kpis_before: ctx.kpis_before || engine.visibility?.oscillation?.before_count
    }),
    graceful_degradation: true,
    fabricated: false,
    payload_legacy_preserved: !engine.stability_applied
  };

  const kpi_visibility_integrity = {
    phase: 'Z.6',
    visibility_stable: engine.visibility?.visibility_stable,
    oscillation: engine.visibility?.oscillation,
    consistency: engine.visibility?.consistency,
    recovery: engine.visibility?.recovery,
    minimum: engine.minimum
  };

  const kpi_operational_quality = engine.quality;

  return {
    kpis: responseKpis,
    kpi_runtime_stability,
    kpi_visibility_integrity,
    kpi_operational_quality
  };
}

function getKpiRuntimeStabilityReport(user = {}, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  const pack = applyKpiRuntimeStability(user, ctx.kpis || [], ctx);
  return {
    ok: true,
    pilot: isPilotTenant(tenantId),
    status: getKpiRuntimeStabilityStatus({ tenant_id: tenantId }),
    ...pack
  };
}

module.exports = {
  getKpiRuntimeStabilityStatus,
  applyKpiRuntimeStability,
  getKpiRuntimeStabilityReport,
  runKpiRuntimeStabilityEngine
};
