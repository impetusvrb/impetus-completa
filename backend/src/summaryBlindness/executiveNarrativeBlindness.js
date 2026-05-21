'use strict';

const { extractSummaryText, summaryWordCount } = require('../summaryConvergence/summaryTextExtractor');

function detectExecutiveNarrativeBlindness(summaryPayload = {}, ctx = {}) {
  const tier = String(ctx.hierarchy_tier || '').toLowerCase();
  if (!['executive', 'director'].includes(tier)) return { blind: false, not_applicable: true };
  const text = extractSummaryText(summaryPayload);
  const words = summaryWordCount(text);
  const strategic = /estratég|board|margem|esg|resultado/i.test(text);
  return { blind: words > 0 && !strategic && words < 50, critical: words < 15, tier: 'executive' };
}

module.exports = { detectExecutiveNarrativeBlindness };
