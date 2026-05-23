'use strict';

const { filterBlocksByDomainIsolation } = require('../runtime/crossDomainProtection');

function composeWithGovernance(domain, blocks = [], governanceCtx = {}) {
  const { blocks: safe, filtered_count, violations } = filterBlocksByDomainIsolation(domain, blocks);

  if (governanceCtx.governance_locked && governanceCtx.mutation_after_lock_detected) {
    return {
      blocks: [],
      governance_blocked: true,
      reason: 'mutation_after_lock',
      filtered_count: blocks.length
    };
  }

  const governed = safe.map((b) => ({
    ...b,
    governance_safe: true,
    cross_domain_violation: false
  }));

  return {
    blocks: governed,
    governance_blocked: false,
    filtered_count,
    violations,
    governance_ctx: {
      locked: governanceCtx.governance_locked === true,
      terminal_safe: true,
      global_replace: false
    }
  };
}

module.exports = { composeWithGovernance };
