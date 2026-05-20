'use strict';

const KNOWN_PIPELINES = [
  { id: 'semantic_alignment', phase: 'K', overlaps: ['precision_delivery'] },
  { id: 'precision_delivery', phase: 'L', overlaps: ['semantic_alignment', 'cognitive_convergence'] },
  { id: 'cognitive_convergence', phase: 'M', overlaps: ['precision_delivery', 'enterprise_cognitive_operations'] },
  { id: 'enterprise_cognitive_operations', phase: 'N', overlaps: ['cognitive_convergence'] },
  { id: 'smart_summary_enricher', phase: 'legacy', overlaps: ['cognitive_convergence'] },
  { id: 'contextual_modules', phase: '6', overlaps: ['semantic_alignment'] }
];

function analyzePipelineRedundancy(activeBlocks = {}) {
  const active = KNOWN_PIPELINES.filter((p) => activeBlocks[p.id]);
  const pairs = [];
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i];
      const b = active[j];
      if (a.overlaps.includes(b.id) || b.overlaps.includes(a.id)) {
        pairs.push({ a: a.id, b: b.id, phases: [a.phase, b.phase] });
      }
    }
  }
  return {
    active_pipelines: active.map((p) => p.id),
    redundant_pairs: pairs,
    redundancy_count: pairs.length,
    auto_remove: false
  };
}

module.exports = { analyzePipelineRedundancy, KNOWN_PIPELINES };
