'use strict';

const { resolveOperationalAuthority } = require('./operationalAuthorityResolver');
const { resolveDomainTargeting } = require('./contextualDomainTargeting');
const { resolveHierarchy } = require('./contextualHierarchyResolver');

function buildContextualTarget(user, ctx = {}) {
  const hierarchy = resolveHierarchy(user, ctx);
  const authority = resolveOperationalAuthority(user, ctx);
  const domain = resolveDomainTargeting(user, ctx);
  const runtimeTruth = ctx.runtime_truth_state || null;

  return {
    targeting: {
      hierarchy,
      authority,
      domain,
      runtime_truth_axis: runtimeTruth?.authority?.contextual_truth?.functional_axis || domain.domain
    },
    contextual_delivery_confidence: Number(
      ((hierarchy.hierarchy_integrity + authority.authority_integrity + domain.domain_targeting_precision) / 3).toFixed(4)
    ),
    ambiguous: domain.domain === 'general' && !user?.functional_axis
  };
}

module.exports = { buildContextualTarget };
