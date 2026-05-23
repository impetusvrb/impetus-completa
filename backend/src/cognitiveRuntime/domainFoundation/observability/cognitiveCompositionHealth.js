'use strict';

const { computeSemanticIsolationMetrics } = require('./semanticIsolationMetrics');

function computeMultiDomainCognitiveHealth(compositionResult = {}, opts = {}) {
  const isolation = computeSemanticIsolationMetrics(compositionResult);
  const blockCount = compositionResult.block_count ?? 0;
  const cockpitReady = compositionResult.cockpit_ready === true;
  const fidelity = compositionResult.semantic_fidelity ?? 0;

  const operationalBlocks = (compositionResult.composed_blocks || compositionResult.orchestrated_blocks || [])
    .filter((b) => (b.semantic_layer || 'operational') === 'operational').length;
  const operationalUsefulness = blockCount > 0
    ? Math.round((operationalBlocks / blockCount) * 1000) / 1000
    : 0;

  const genericityReduction = cockpitReady ? Math.min(1, fidelity * 0.6 + 0.4) : 0;
  const compositionStability = blockCount > 0 && isolation.cross_domain_isolation >= 0.9 ? 1 : 0.7;

  return {
    semantic_fidelity: isolation.semantic_fidelity,
    cross_domain_isolation: isolation.cross_domain_isolation,
    operational_usefulness: operationalUsefulness,
    genericity_reduction: Math.round(genericityReduction * 1000) / 1000,
    composition_stability: compositionStability,
    isolation_grade: isolation.isolation_grade,
    healthy: isolation.cross_domain_isolation >= 0.9 && fidelity >= 0.7 && compositionStability >= 0.7,
    domain: compositionResult.domain,
    cockpit_ready: cockpitReady
  };
}

module.exports = { computeMultiDomainCognitiveHealth };
