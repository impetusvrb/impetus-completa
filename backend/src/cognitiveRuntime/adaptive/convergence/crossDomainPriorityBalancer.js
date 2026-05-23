'use strict';

const { prioritizeRelevance } = require('../usefulness/relevancePrioritizer');

function balanceCrossDomainPriority(usefulness = {}) {
  const rank = prioritizeRelevance(usefulness);
  return {
    cross_domain_priority: rank.relevance_rank,
    conflict_detected: rank.relevance_rank.length > 1 && rank.relevance_rank[0].score - rank.relevance_rank[1].score < 0.05
  };
}

module.exports = { balanceCrossDomainPriority };
