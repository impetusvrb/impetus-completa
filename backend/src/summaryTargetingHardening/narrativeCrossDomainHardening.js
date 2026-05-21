'use strict';

const { extractSummaryText } = require('../summaryConvergence/summaryTextExtractor');
const { FORBIDDEN_BY_TIER } = require('./hierarchyNarrativeTargeting');

function filterCrossDomainSentences(text = '', tier = 'coordination') {
  const forbidden = FORBIDDEN_BY_TIER[tier] || [];
  if (!text || forbidden.length === 0) return { text, filtered: false, removed: [] };

  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  const removed = [];
  const kept = [];

  for (const s of sentences) {
    const lower = s.toLowerCase();
    const leak = forbidden.some((f) => lower.includes(f));
    if (leak) removed.push(s);
    else kept.push(s);
  }

  const filtered = removed.length > 0;
  return {
    text: kept.join(' ').trim() || text,
    filtered,
    removed,
    narrative_fabricated: false
  };
}

function hardenCrossDomainNarrative(summaryPayload = {}, ctx = {}) {
  const tier = String(ctx.hierarchy_tier || 'coordination').toLowerCase();
  const original = extractSummaryText(summaryPayload);
  const result = filterCrossDomainSentences(original, tier);
  return { ...result, tier, enforcement_candidate: result.filtered };
}

module.exports = { hardenCrossDomainNarrative, filterCrossDomainSentences };
