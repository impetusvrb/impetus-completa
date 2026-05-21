'use strict';

function assessTenantHierarchyIntegrity(identity = {}) {
  const missing = [];
  if (identity.hierarchy_level == null) missing.push('hierarchy_level');
  if (!identity.hierarchy_tier) missing.push('hierarchy_tier');
  if (!identity.role) missing.push('role');

  const consistent =
    missing.length === 0 &&
    ((identity.hierarchy_level <= 2 && identity.hierarchy_tier === 'executive') ||
      (identity.hierarchy_level >= 4 && ['operational', 'supervision'].includes(identity.hierarchy_tier)) ||
      (identity.hierarchy_level >= 2 && identity.hierarchy_level <= 4));

  return {
    hierarchy_integrity_ok: consistent || missing.length === 0,
    integrity_score: Number(Math.max(0.4, 1 - missing.length * 0.15).toFixed(4)),
    missing_fields: missing,
    consistent
  };
}

module.exports = { assessTenantHierarchyIntegrity };
