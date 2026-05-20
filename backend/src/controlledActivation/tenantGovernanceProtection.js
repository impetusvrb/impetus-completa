'use strict';

function protectTenantGovernance(tenantId, ctx = {}) {
  return {
    tenant_id: tenantId,
    isolated: true,
    cross_tenant_activation_blocked: true,
    rollback_scope: `tenant:${tenantId}`,
    preserve_other_tenants: true,
    global_rollout_forbidden: ctx.global_rollout !== true
  };
}

module.exports = { protectTenantGovernance };
