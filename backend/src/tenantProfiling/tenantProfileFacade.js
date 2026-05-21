'use strict';

const flags = require('../contextualEnforcement/config/phaseZ1FeatureFlags');
const { assessTenantDeliveryReadiness } = require('./tenantDeliveryReadiness');

function getTenantProfilingStatus(ctx = {}) {
  return {
    phase: 'Z.1',
    layer: 'tenant-profiling',
    profiling: flags.isTenantDeliveryProfilingEnabled(),
    observability: flags.isContextualEnforcementObservabilityEnabled(),
    enforcement_applied: false,
    tenant_id: ctx.tenant_id
  };
}

function getTenantProfileReport(tenantId, identity = {}, ctx = {}) {
  const readiness = assessTenantDeliveryReadiness(tenantId, identity, ctx);
  return { ok: true, status: getTenantProfilingStatus({ tenant_id: tenantId }), ...readiness };
}

module.exports = {
  getTenantProfilingStatus,
  assessTenantDeliveryReadiness,
  getTenantProfileReport
};
