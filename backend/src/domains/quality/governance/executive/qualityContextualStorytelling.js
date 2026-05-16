'use strict';

const { composeNarrative } = require('./qualityNarrativeComposer');
const { executiveInsightBundle } = require('./qualityExecutiveInsights');

function buildContextualStory(signals = {}) {
  const bundle = executiveInsightBundle({
    spcResult: signals.spc_result,
    defectCounts: signals.defect_counts,
    trendSeries: signals.trend_series
  });
  const headline =
    bundle.spc[0]?.text || bundle.trend[0]?.text || bundle.pareto[0]?.text || 'Qualidade estável dentro do recorte analisado.';
  const narrative = composeNarrative({
    headline,
    detail: signals.context_detail || '',
    suggested_follow_up: 'Rever dados na linha e evidências; decisões permanecem humanas.'
  });
  return { narrative, bundle, bounded_cognition: true };
}

module.exports = {
  buildContextualStory
};
