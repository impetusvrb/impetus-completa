'use strict';

function prioritizeRelevance(usefulness = {}) {
  const domains = usefulness.domains || {};
  const ranked = Object.entries(domains)
    .filter(([, v]) => v != null)
    .sort((a, b) => b[1] - a[1])
    .map(([domain, score]) => ({ domain, score }));
  return { relevance_rank: ranked, top_domain: ranked[0]?.domain || null };
}

module.exports = { prioritizeRelevance };
