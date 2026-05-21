'use strict';

const { extractSummaryText } = require('./summaryTextExtractor');

function assureExecutiveNarrative(summaryPayload = {}, ctx = {}) {
  const tier = String(ctx.hierarchy_tier || '').toLowerCase();
  if (!['executive', 'director'].includes(tier)) return { assured: true, not_applicable: true };
  const text = extractSummaryText(summaryPayload);
  const strategic = /estratég|visão|board|margem|resultado|esg|investimento/i.test(text);
  return { assured: strategic || text.length < 30, strategic_tone: strategic, tier };
}

module.exports = { assureExecutiveNarrative };
