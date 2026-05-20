'use strict';

const { resolveHierarchy } = require('./contextualHierarchyResolver');

function resolveOperationalAuthority(user, ctx = {}) {
  const hierarchy = resolveHierarchy(user, ctx);
  const axis = ctx.functional_axis || user?.functional_axis || user?.functional_area || 'general';
  const tenantAdmin = user?.is_tenant_admin === true || user?.is_internal_admin === true;

  return {
    operational_authority: tenantAdmin ? 'tenant_admin' : hierarchy.hierarchy_band,
    functional_axis: axis,
    department: user?.department || ctx.department || null,
    job_function: user?.job_function || ctx.job_function || user?.role,
    authority_integrity: tenantAdmin ? 0.95 : hierarchy.hierarchy_integrity,
    can_view_executive: hierarchy.hierarchy_band === 'executive' || hierarchy.hierarchy_band === 'director',
    can_view_corporate_aggregate: ['executive', 'director'].includes(hierarchy.hierarchy_band)
  };
}

module.exports = { resolveOperationalAuthority };
