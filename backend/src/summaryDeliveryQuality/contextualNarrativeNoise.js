'use strict';

const { extractSummaryText } = require('../summaryConvergence/summaryTextExtractor');

const NOISE = ['lorem', 'placeholder', 'todo', 'n/a', 'sem dados'];

function measureContextualNarrativeNoise(summaryPayload = {}) {
  const text = extractSummaryText(summaryPayload).toLowerCase();
  const hits = NOISE.filter((n) => text.includes(n));
  return { noisy: hits.length > 0, noise_markers: hits, noise_score: hits.length ? 0.8 : 0 };
}

module.exports = { measureContextualNarrativeNoise };
