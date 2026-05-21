'use strict';

const { extractSummaryText, summaryWordCount } = require('../summaryConvergence/summaryTextExtractor');
const { getMinimumWordCount } = require('./contextualNarrativeMinimums');

function validateNarrativeCoverage(summaryPayload = {}, ctx = {}) {
  const text = extractSummaryText(summaryPayload);
  const words = summaryWordCount(text);
  const min = getMinimumWordCount(ctx);
  const covered = words >= min;

  return {
    word_count: words,
    minimum_required: min,
    covered,
    underdelivery: !covered && words > 0,
    critical_underdelivery: words === 0
  };
}

module.exports = { validateNarrativeCoverage };
