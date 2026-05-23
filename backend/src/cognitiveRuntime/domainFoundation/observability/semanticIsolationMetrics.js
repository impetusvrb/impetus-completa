'use strict';

function computeSemanticIsolationMetrics(compositionResult = {}) {
  const violations = compositionResult.isolation?.violation_count ?? 0;
  const blocks = compositionResult.block_count ?? 0;
  const fidelity = compositionResult.semantic_fidelity ?? 1;

  const crossDomainIsolation = violations === 0 ? 1 : Math.max(0, 1 - violations / Math.max(blocks, 1));

  return {
    cross_domain_isolation: Math.round(crossDomainIsolation * 1000) / 1000,
    semantic_fidelity: Math.round(fidelity * 1000) / 1000,
    violations,
    blocks_total: blocks,
    isolation_grade: crossDomainIsolation >= 0.95 ? 'excellent' : crossDomainIsolation >= 0.8 ? 'good' : 'degraded'
  };
}

module.exports = { computeSemanticIsolationMetrics };
