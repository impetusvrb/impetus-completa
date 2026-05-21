'use strict';

const { extractSummaryText, summaryWordCount } = require('../summaryConvergence/summaryTextExtractor');

function detectWeakOperationalGuidance(summaryPayload = {}, ctx = {}) {
  const tier = String(ctx.hierarchy_tier || '').toLowerCase();
  if (!['operational', 'supervisor', 'coordination'].includes(tier)) {
    return { weak: false, not_applicable: true };
  }
  const text = extractSummaryText(summaryPayload);
  const words = summaryWordCount(text);
  const actionable = /próximo|priorize|verificar|executar|ação|urgente/i.test(text);
  return { weak: words >= 15 && !actionable, critical: words >= 30 && !actionable, word_count: words };
}

module.exports = { detectWeakOperationalGuidance };
