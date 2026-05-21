'use strict';

const TIER_MIN_WORDS = Object.freeze({
  executive: 12,
  director: 12,
  coordination: 10,
  supervisor: 10,
  operational: 10,
  staff: 8
});

function getMinimumWordCount(ctx = {}) {
  const tier = String(ctx.hierarchy_tier || 'coordination').toLowerCase();
  return TIER_MIN_WORDS[tier] ?? 10;
}

module.exports = { getMinimumWordCount, TIER_MIN_WORDS };
