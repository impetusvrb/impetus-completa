'use strict';

function buildOperationalScopeMatrix(identity = {}, ctx = {}) {
  const scope = identity.operational_scope || 'department';
  const tenantId = identity.tenant_id || ctx.tenant_id;

  return {
    tenant_id: tenantId,
    operational_scope: scope,
    department: identity.department || ctx.department,
    job_title: identity.job_title,
    area: ctx.functional_area || identity.functional_axis,
    domain: identity.domain_axis,
    tenant_isolated: !!tenantId,
    cross_tenant_delivery: false,
    enforcement_applied: false
  };
}

module.exports = { buildOperationalScopeMatrix };
