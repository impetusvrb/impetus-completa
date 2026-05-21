'use strict';

const { extractSummaryText, summaryWordCount } = require('./summaryTextExtractor');

function measureNarrativeContextualAgreement(summaryPayload = {}, ctx = {}) {
  const text = extractSummaryText(summaryPayload);
  const words = summaryWordCount(text);
  const hasContext = words >= 25;
  const vague = /em breve|aguarde|sem dados|indisponível|n\/a/i.test(text);
  const agreement_score = hasContext && !vague ? 0.85 : vague ? 0.35 : 0.55;
  return {
    agreement_score: Number(agreement_score.toFixed(4)),
    coherent: hasContext && !vague,
    word_count: words,
    vague_detected: vague
  };
}

module.exports = { measureNarrativeContextualAgreement };
