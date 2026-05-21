'use strict';

const { extractSummaryText } = require('../summaryConvergence/summaryTextExtractor');

function measureNarrativeSignalStrength(summaryPayload = {}, ctx = {}) {
  const text = extractSummaryText(summaryPayload);
  const tokens = text.split(/\s+/).filter(Boolean);
  const unique = new Set(tokens.map((t) => t.toLowerCase()));
  const ratio = tokens.length ? unique.size / tokens.length : 0;
  const strong = ratio > 0.55 && tokens.length >= 8;

  return { signal_strength: strong ? Math.min(1, ratio) : ratio * 0.6, strong, token_diversity: ratio };
}

module.exports = { measureNarrativeSignalStrength };
