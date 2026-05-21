'use strict';

const flags = require('../pilotMaturity/config/phaseZ4FeatureFlags');
const { collectPilotRuntimeObservability } = require('./pilotRuntimeObservability');
const { consolidatePilotLeakage } = require('./pilotLeakageConsolidator');
const { consolidatePilotUnderdelivery } = require('./pilotUnderdeliveryConsolidator');
const { assessPilotHierarchyHealth } = require('./pilotHierarchyHealth');
const { buildPilotGovernanceTimeline } = require('./pilotGovernanceTimeline');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');

function getPilotObservabilityStatus(ctx = {}) {
  return {
    phase: 'Z.4',
    layer: 'pilot-observability',
    observability: flags.isPilotObservabilityEnabled(),
    tenant_id: ctx.tenant_id
  };
}

function consolidatePilotObservability(tenantId, pack = {}) {
  const observability = collectPilotRuntimeObservability({ tenant_id: tenantId, ...pack });
  return {
    status: getPilotObservabilityStatus({ tenant_id: tenantId }),
    observability,
    leakage: consolidatePilotLeakage(pack),
    underdelivery: consolidatePilotUnderdelivery(pack),
    hierarchy_health: assessPilotHierarchyHealth(pack),
    timeline: buildPilotGovernanceTimeline(tenantId, {
      maturity_score: pack.maturity?.maturity_score,
      kpi_channel_ready: pack.maturity?.kpi_channel_ready,
      pilot_activation: pack.pilot_activation
    }),
    rollback_ready: pack.rollback_ready !== false,
    degradation_safe: pack.degradation_safe !== false
  };
}

function getPilotObservabilityReport(user = {}, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  if (!isPilotTenant(tenantId) && !ctx.force) {
    return { ok: true, pilot: false, reason: 'not_pilot_tenant' };
  }
  return { ok: true, pilot: true, ...consolidatePilotObservability(tenantId, ctx) };
}

module.exports = {
  getPilotObservabilityStatus,
  consolidatePilotObservability,
  getPilotObservabilityReport
};
