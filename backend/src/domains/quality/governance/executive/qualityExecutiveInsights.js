'use strict';

const { paretoStory } = require('./qualityNarrativeComposer');
const { detectDrift } = require('../spc/qualityTrendAnalysisEngine');

function insightsFromSpc(spcResult) {
  if (!spcResult) {
    return [{ level: 'info', text: 'SPC não avaliado neste pacote.' }];
  }
  if (!spcResult.ok) {
    return [{ level: 'info', text: `SPC indisponível: ${spcResult.reason || spcResult.error || '—'}.` }];
  }
  if (!spcResult.violation_count) return [{ level: 'info', text: 'SPC X-bar sem violações nas regras avaliadas.' }];
  return [
    {
      level: 'warn',
      text: `Foram detetadas ${spcResult.violation_count} violação(ões) nas regras SPC (Nelson/Western Electric — subconjunto).`
    }
  ];
}

function insightsFromTrend(series) {
  const d = detectDrift(series);
  if (d.error || !d.drift_significant) return [];
  return [{ level: 'warn', text: `Tendência de processo (${d.direction}) com inclinação ${d.slope?.toFixed(4)} por passo.` }];
}

function executiveInsightBundle({ spcResult, defectCounts, trendSeries }) {
  return {
    spc: insightsFromSpc(spcResult),
    pareto: [{ level: 'info', text: paretoStory(defectCounts || {}) }],
    trend: insightsFromTrend(trendSeries || []),
    advisory_only: true
  };
}

module.exports = {
  insightsFromSpc,
  insightsFromTrend,
  executiveInsightBundle
};
