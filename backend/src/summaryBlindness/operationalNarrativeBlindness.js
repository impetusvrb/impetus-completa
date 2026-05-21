'use strict';

const { extractSummaryText, summaryWordCount } = require('../summaryConvergence/summaryTextExtractor');

function detectOperationalNarrativeBlindness(summaryPayload = {}, ctx = {}) {
  const tier = String(ctx.hierarchy_tier || '').toLowerCase();
  if (tier !== 'operational') return { blind: false, not_applicable: true };
  const text = extractSummaryText(summaryPayload);
  const words = summaryWordCount(text);
  const guidance = /operacional|ação|prioridade|linha|turno/i.test(text);
  return { blind: words > 0 && !guidance && words < 40, critical: words < 20, tier: 'operational' };
}

module.exports = { detectOperationalNarrativeBlindness };
