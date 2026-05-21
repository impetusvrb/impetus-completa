'use strict';

const flags = require('../kpiRuntimeEnforcement/config/phaseZ5FeatureFlags');
const { collectKpiPilotRuntimeObservability } = require('./kpiPilotRuntimeObservability');
const { consolidateKpiLeakage } = require('./kpiLeakageConsolidator');
const { consolidateKpiUnderdelivery } = require('./kpiUnderdeliveryConsolidator');
const { buildKpiDeliveryTimeline } = require('./kpiDeliveryTimeline');
const { assessKpiRollbackReadiness } = require('./kpiRollbackReadiness');
const { isPilotTenant } = require('../pilotTenants/pilotTenantRegistry');

function getKpiPilotObservabilityStatus(ctx = {}) {
  return {
    phase: 'Z.5',
    layer: 'kpi-pilot-observability',
    observability: flags.isKpiPilotObservabilityEnabled(),
    tenant_id: ctx.tenant_id
  };
}

function consolidateKpiPilotObservability(tenantId, pack = {}) {
  const rollback = assessKpiRollbackReadiness(tenantId, {
    kpis_before: pack.pipeline?.before
  });
  return {
    status: getKpiPilotObservabilityStatus({ tenant_id: tenantId }),
    runtime: collectKpiPilotRuntimeObservability({ tenant_id: tenantId, ...pack }),
    leakage: consolidateKpiLeakage(pack),
    underdelivery: consolidateKpiUnderdelivery(pack),
    timeline: buildKpiDeliveryTimeline(tenantId, pack),
    rollback,
    enforcement_health: {
      applied: pack.pipeline?.enforcement_applied === true,
      fabricated: false
    }
  };
}

function getKpiPilotObservabilityReport(user = {}, ctx = {}) {
  const tenantId = user?.company_id || ctx.tenant_id;
  if (!isPilotTenant(tenantId) && !ctx.force) {
    return { ok: true, pilot: false, reason: 'not_pilot_tenant' };
  }
  return { ok: true, pilot: true, ...consolidateKpiPilotObservability(tenantId, ctx) };
}

module.exports = {
  getKpiPilotObservabilityStatus,
  consolidateKpiPilotObservability,
  getKpiPilotObservabilityReport
};
