'use strict';

const { extractSummaryText } = require('../summaryConvergence/summaryTextExtractor');

function detectNarrativeAmbiguity(summaryPayload = {}) {
  const text = extractSummaryText(summaryPayload);
  const patterns = [
    /talvez/i,
    /pode ser/i,
    /não está claro/i,
    /incerto/i,
    /ambíguo/i,
    /em análise/i
  ];
  const hits = patterns.filter((p) => p.test(text)).map((p) => p.source);
  return { ambiguous: hits.length > 0, ambiguity_count: hits.length, patterns: hits };
}

module.exports = { detectNarrativeAmbiguity };
