'use strict';

/**
 * Hierarchy tiers — compatível com operationalIdentityGovernance / terminal lock.
 * min_hierarchy_tier: menor número = mais alto na hierarquia (executive=0).
 */
const HIERARCHY_TIERS = Object.freeze({
  executive: { level: 0, label: 'executive', max_strategic: 0.8 },
  direction: { level: 1, label: 'direction', max_strategic: 0.6 },
  management: { level: 2, label: 'management', max_strategic: 0.4 },
  coordination: { level: 3, label: 'coordination', max_strategic: 0.2 },
  supervision: { level: 4, label: 'supervision', max_strategic: 0.1 },
  operational: { level: 5, label: 'operational', max_strategic: 0.05 }
});

const PROFILE_TIER_MAP = Object.freeze({
  ceo_executive: 'executive',
  cfo_executive: 'executive',
  director_quality: 'direction',
  director_safety: 'direction',
  manager_quality: 'management',
  manager_safety: 'management',
  coordinator_quality: 'coordination',
  coordinator_safety: 'coordination',
  coordinator_environmental: 'coordination',
  supervisor_operational: 'supervision',
  operator: 'operational'
});

function resolveHierarchyTier(ctx = {}) {
  const explicit = ctx.hierarchy_tier || ctx.canonical_identity?.hierarchy_tier;
  if (explicit && HIERARCHY_TIERS[explicit]) return explicit;
  const pc = String(ctx.profile_code || '').toLowerCase();
  if (PROFILE_TIER_MAP[pc]) return PROFILE_TIER_MAP[pc];
  const level = ctx.hierarchy_level ?? ctx.canonical_identity?.hierarchy_level;
  if (level != null && level <= 1) return 'executive';
  if (level === 2) return 'management';
  if (level === 3) return 'coordination';
  if (level === 4) return 'supervision';
  return 'coordination';
}

function tierMeetsMinimum(userTier, blockMinTier) {
  const u = HIERARCHY_TIERS[userTier] || HIERARCHY_TIERS.coordination;
  const b = HIERARCHY_TIERS[blockMinTier] || HIERARCHY_TIERS.operational;
  return u.level <= b.level;
}

function buildAuthorityMetadata(block, ctx = {}) {
  const userTier = resolveHierarchyTier(ctx);
  const allowed = tierMeetsMinimum(userTier, block.authority?.min_hierarchy_tier || 'operational');
  const domainOk =
    block.authority?.cross_domain_allowed === true ||
    require('./cognitiveBlockDomains').isDomainOwner(
      block.domain,
      ctx.domain_axis || ctx.functional_axis
    );
  return {
    user_tier: userTier,
    block_min_tier: block.authority?.min_hierarchy_tier,
    authority_granted: allowed && domainOk,
    domain_owner_match: domainOk,
    hierarchy_granted: allowed
  };
}

module.exports = {
  HIERARCHY_TIERS,
  PROFILE_TIER_MAP,
  resolveHierarchyTier,
  tierMeetsMinimum,
  buildAuthorityMetadata
};
