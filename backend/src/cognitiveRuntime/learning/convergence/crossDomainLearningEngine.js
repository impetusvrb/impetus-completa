'use strict';

function learnCrossDomain(store = {}, payload = {}) {
  const domains = ['quality', 'safety', 'hr', 'production', 'environmental', 'executive'];
  const active = domains.filter((d) => {
    const key = d === 'quality' ? 'specialized_cognitive_runtime' : d === 'safety' ? 'sst_cognitive_runtime' : `${d}_cognitive_runtime`;
    return payload[key]?.consolidation_applied;
  });
  return { cross_domain_maturity: active.length, domains: active };
}

module.exports = { learnCrossDomain };
