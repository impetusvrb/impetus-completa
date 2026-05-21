'use strict';

function validateHierarchyTargeting(identity = {}, ctx = {}) {
  const tier = String(identity.hierarchy_tier || '').toLowerCase();
  const level = identity.hierarchy_level ?? 3;
  const issues = [];
  if (!tier && level == null) issues.push({ type: 'hierarchy_incomplete' });
  if (tier === 'operational' && level != null && level < 4) {
    issues.push({ type: 'level_tier_mismatch', severity: 'medium' });
  }
  return { valid: issues.length === 0, issues, tier, level };
}

module.exports = { validateHierarchyTargeting };
