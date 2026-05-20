'use strict';

function recommendDeduplication(analysis = {}) {
  return (analysis.redundant_pairs || []).map((p) => ({
    action: 'review_consolidation',
    pipelines: [p.a, p.b],
    reason: `Overlap entre fases ${p.phases.join(' e ')}`,
    auto_execute: false
  }));
}

module.exports = { recommendDeduplication };
