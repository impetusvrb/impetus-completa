'use strict';

const { summaryWordCount, extractSummaryText } = require('../summaryConvergence/summaryTextExtractor');

function analyzeNarrativeGaps(summaryPayload = {}, ctx = {}) {
  const words = summaryWordCount(extractSummaryText(summaryPayload));
  const expected = ctx.expected_words ?? 30;
  const gap = Math.max(0, expected - words);
  return {
    gap_detected: gap > 10,
    gap_words: gap,
    severity: gap > 25 ? 'critical' : gap > 10 ? 'medium' : 'low'
  };
}

module.exports = { analyzeNarrativeGaps };
