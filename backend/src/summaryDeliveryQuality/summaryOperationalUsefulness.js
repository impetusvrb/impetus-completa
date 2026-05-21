'use strict';

const { extractSummaryText, summaryWordCount } = require('../summaryConvergence/summaryTextExtractor');

function measureSummaryOperationalUsefulness(summaryPayload = {}, ctx = {}) {
  const text = extractSummaryText(summaryPayload);
  const words = summaryWordCount(text);
  const actionable = /\b(verificar|executar|prioridade|alinhar|monitorar)\b/i.test(text);
  const score = Math.min(1, (words >= 10 ? 0.4 : 0) + (actionable ? 0.5 : 0.1));

  return { usefulness_score: score, actionable, word_count: words, vague: words > 0 && !actionable && words < 15 };
}

module.exports = { measureSummaryOperationalUsefulness };
