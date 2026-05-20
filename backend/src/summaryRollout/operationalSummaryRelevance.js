'use strict';

const { scoreContextualNarrative } = require('./contextualNarrativeScorer');
const { validateHierarchySummary } = require('./hierarchySummaryValidator');
const { stabilizeSummarySemantics } = require('./summarySemanticStabilizer');

function measureOperationalSummaryRelevance(user, summaryPayload, ctx = {}) {
  const semantic = stabilizeSummarySemantics(user, summaryPayload, ctx);
  const hierarchy = validateHierarchySummary(user, summaryPayload, ctx);
  const scores = scoreContextualNarrative(user, summaryPayload, ctx);

  return {
    operational_relevance: scores.operational_precision,
    summary_usefulness: scores.summary_usefulness,
    hierarchy_coherence: hierarchy.hierarchy_coherence,
    narrative_integrity: semantic.narrative.narrative_integrity,
    contextual_alignment: scores.contextual_alignment,
    semantic
  };
}

module.exports = { measureOperationalSummaryRelevance };
