'use strict';

const { extractSummaryText, summaryWordCount } = require('./summaryTextExtractor');

function assureManagerialNarrative(summaryPayload = {}, ctx = {}) {
  const tier = String(ctx.hierarchy_tier || '').toLowerCase();
  if (!['coordination', 'supervisor'].includes(tier)) return { assured: true, not_applicable: true };
  const words = summaryWordCount(extractSummaryText(summaryPayload));
  return { assured: words >= 20, managerial_depth: words >= 40, word_count: words };
}

module.exports = { assureManagerialNarrative };
