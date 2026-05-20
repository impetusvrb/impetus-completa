'use strict';

const REGISTRY = {
  contextual: { version: 1, authority: 'contextual_truth_authority' },
  semantic: { version: 1, authority: 'unified_semantic_assembly' },
  operational: { version: 1, authority: 'runtime_truth_resolver' },
  kpi: { version: 1, authority: 'unified_kpi_truth_resolver' },
  summary: { version: 1, authority: 'unified_summary_truth_resolver' },
  insight: { version: 1, authority: 'unified_insight_resolver' }
};

function getTruthRegistry() {
  return { ...REGISTRY, registered_at: new Date().toISOString() };
}

function resolveAuthorityForChannel(channel) {
  const key = ['kpi', 'summary', 'insight'].includes(channel) ? channel : 'contextual';
  return REGISTRY[key] || REGISTRY.contextual;
}

module.exports = { getTruthRegistry, resolveAuthorityForChannel, REGISTRY };
