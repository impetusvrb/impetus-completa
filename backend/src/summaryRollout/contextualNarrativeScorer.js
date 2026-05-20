'use strict';

const { validateContextualSummary } = require('./contextualSummaryValidator');
const { analyzeSummaryUsefulness } = require('./summaryUsefulnessAnalyzer');

function scoreContextualNarrative(user, summaryPayload, ctx = {}) {
  const contextual = validateContextualSummary(user, summaryPayload, ctx);
  const usefulness = analyzeSummaryUsefulness(summaryPayload, ctx);
  return {
    contextual_alignment: contextual.contextual_alignment_score,
    summary_usefulness: usefulness.summary_usefulness,
    operational_precision: Number(
      ((contextual.contextual_alignment_score + usefulness.summary_usefulness) / 2).toFixed(4)
    )
  };
}

module.exports = { scoreContextualNarrative };
