'use strict';

const { extractSummaryText } = require('./summaryPayloadUtils');

function analyzeSummaryUsefulness(summaryPayload, ctx = {}) {
  const text = extractSummaryText(summaryPayload);
  const len = text.length;
  const hasAction = /\b(recomend|prioriz|verificar|ação|mitigar)\b/i.test(text);
  const hasMetric = /\b\d+([.,]\d+)?%?\b/.test(text);
  const weak = len < 80 || (!hasAction && !hasMetric);

  const usefulness = Number(
    Math.min(1, (len > 120 ? 0.35 : len / 400) + (hasAction ? 0.35 : 0) + (hasMetric ? 0.3 : 0.1)).toFixed(4)
  );

  return {
    summary_usefulness: usefulness,
    weak_summary: weak,
    low_usefulness: usefulness < 0.55
  };
}

module.exports = { analyzeSummaryUsefulness };
