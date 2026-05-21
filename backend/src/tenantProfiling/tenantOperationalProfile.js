'use strict';

function buildTenantOperationalProfile(tenantId, identity = {}, ctx = {}) {
  return {
    tenant_id: tenantId,
    company_id: tenantId,
    profile_code: identity.profile_code || ctx.profile_code,
    functional_axis: identity.functional_axis || identity.domain_axis,
    department: identity.department || ctx.department,
    job_title: identity.job_title,
    role: identity.role,
    hierarchy_level: identity.hierarchy_level,
    operational_scope: identity.operational_scope,
    inference_complete: identity.inference_complete !== false,
    configured_at: ctx.configured_at || null
  };
}

module.exports = { buildTenantOperationalProfile };
