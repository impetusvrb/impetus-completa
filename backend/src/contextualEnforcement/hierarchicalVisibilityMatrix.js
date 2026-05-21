'use strict';

const TIERS = {
  1: { tier: 'executive', max_operational_depth: 0, strategic_only: true },
  2: { tier: 'management', max_operational_depth: 1, strategic_only: false },
  3: { tier: 'coordination', max_operational_depth: 2, strategic_only: false },
  4: { tier: 'supervision', max_operational_depth: 3, strategic_only: false },
  5: { tier: 'operational', max_operational_depth: 4, strategic_only: false }
};

function buildHierarchicalVisibilityMatrix(identity = {}) {
  const level = identity.hierarchy_level ?? 3;
  const tierDef = TIERS[level] || TIERS[3];

  return {
    hierarchy_level: level,
    hierarchy_tier: identity.hierarchy_tier || tierDef.tier,
    visibility_rules: tierDef,
    executive_visibility: level <= 2,
    operational_floor_visibility: level >= 4,
    widgets_density_cap: level <= 1 ? 6 : level <= 3 ? 10 : 14,
    enforcement_applied: false
  };
}

module.exports = { buildHierarchicalVisibilityMatrix, TIERS };
