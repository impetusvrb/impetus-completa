'use strict';

const { executiveInsightBundle } = require('../executive/qualityExecutiveInsights');
const { contextualSuggestion } = require('./qualityContextualAiAssistant');

function buildOperationalInsightPack(input = {}) {
  const insights = executiveInsightBundle({
    spcResult: input.spc_result,
    defectCounts: input.defect_counts,
    trendSeries: input.trend_series
  });
  const assist = contextualSuggestion({
    line: input.line,
    supplier: input.supplier,
    metric: input.metric
  });
  return { insights, assist, bounded: true };
}

module.exports = {
  buildOperationalInsightPack
};
