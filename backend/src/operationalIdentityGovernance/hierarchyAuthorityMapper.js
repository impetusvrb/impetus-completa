'use strict';

const { normalizeOrganizationalRole } = require('./organizationalRoleNormalizer');

function mapHierarchyAuthority(user = {}, ctx = {}, baseHierarchy = {}) {
  const normalized = normalizeOrganizationalRole(user, ctx);
  if (normalized.matched && normalized.hierarchy_level != null) {
    return {
      ...baseHierarchy,
      hierarchy_level: normalized.hierarchy_level,
      hierarchy_tier: normalized.hierarchy_tier,
      authority_scope:
        normalized.hierarchy_tier === 'executive'
          ? 'strategic'
          : normalized.hierarchy_tier === 'operational'
            ? 'floor'
            : 'tactical',
      mapped_from: normalized.mapping_id,
      governance_applied: true
    };
  }
  return { ...baseHierarchy, governance_applied: false };
}

module.exports = { mapHierarchyAuthority };
