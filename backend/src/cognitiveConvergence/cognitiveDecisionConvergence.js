'use strict';

function convergeDecisions(decisions = []) {
  if (!decisions.length) {
    return { converged: true, decision: null, divergence_count: 0 };
  }
  const keys = decisions.map((d) => JSON.stringify(d.canonical || d));
  const unique = new Set(keys);
  const primary = decisions[0];
  return {
    converged: unique.size <= 1,
    decision: primary,
    divergence_count: unique.size - 1,
    cognitive_consistency_score: unique.size <= 1 ? 1 : Number((1 / unique.size).toFixed(4))
  };
}

module.exports = { convergeDecisions };
