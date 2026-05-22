'use strict';

const { isDomainOwner } = require('../registry/cognitiveBlockDomains');

function validateSemanticIsolation(plan = {}, ctx = {}) {
  const domainAxis = plan.domain_axis || ctx.domain_axis || 'quality';
  const violations = [];

  for (const block of plan.eligible_blocks || []) {
    const full = require('../registry/cognitiveBlockRegistry').getBlockById(block.block_id);
    if (!full) continue;
    if (!isDomainOwner(full.domain, domainAxis) && !full.authority?.cross_domain_allowed) {
      violations.push({
        block_id: block.block_id,
        reason: 'cross_domain_without_authority',
        block_domain: full.domain,
        user_domain: domainAxis
      });
    }
  }

  if (domainAxis === 'quality') {
    const execBlocks = (plan.eligible_blocks || []).filter((b) =>
      String(b.block_id).startsWith('executive.')
    );
    if (execBlocks.length && ctx.hierarchy_tier !== 'executive' && ctx.hierarchy_tier !== 'direction') {
      violations.push({
        block_id: execBlocks.map((b) => b.block_id).join(','),
        reason: 'executive_block_in_non_executive_context'
      });
    }
  }

  return {
    semantic_isolation_valid: violations.length === 0,
    violations,
    domain_axis: domainAxis
  };
}

module.exports = {
  validateSemanticIsolation
};
