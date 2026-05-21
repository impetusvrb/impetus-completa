'use strict';

const { runTenantRuntimeStabilityEngine } = require('./tenantRuntimeStabilityEngine');

function assessTenantRuntimeStability(tenantId, ctx = {}) {
  return runTenantRuntimeStabilityEngine(tenantId, ctx);
}

function getTenantStabilityStatus(ctx = {}) {
  return { phase: 'Z.10', layer: 'tenant-runtime-stability', tenant_id: ctx.tenant_id };
}

module.exports = { assessTenantRuntimeStability, getTenantStabilityStatus };
