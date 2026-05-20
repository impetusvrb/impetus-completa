'use strict';

function protectTenantPrecision(tenantId, ctx = {}) {
  return {
    tenant_id: tenantId,
    cross_tenant_correction_blocked: true,
    independent_targeting: true,
    rollback_scope: `tenant:${tenantId}`,
    global_auto_stabilization: false,
    preserve_other_tenants: ctx.preserve_other_tenants !== false
  };
}

module.exports = { protectTenantPrecision };
