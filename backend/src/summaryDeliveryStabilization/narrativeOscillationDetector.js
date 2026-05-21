'use strict';

const { extractSummaryText, summaryWordCount } = require('../summaryConvergence/summaryTextExtractor');

function detectNarrativeOscillation(current = {}, previous = {}, ctx = {}) {
  const cur = extractSummaryText(current);
  const prev = extractSummaryText(previous || ctx.summary_before || '');
  if (!prev) return { oscillation_detected: false, stable: true };
  const delta = Math.abs(summaryWordCount(cur) - summaryWordCount(prev));
  const oscillation_detected = delta > 80;
  return { oscillation_detected, delta, stable: !oscillation_detected };
}

module.exports = { detectNarrativeOscillation };
