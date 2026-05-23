'use strict';

function learnOperationalSignals(store = {}, payload = {}) {
  const map = [
    ['quality', payload.specialized_cognitive_runtime],
    ['safety', payload.sst_cognitive_runtime],
    ['hr', payload.hr_cognitive_runtime],
    ['production', payload.production_cognitive_runtime],
    ['environmental', payload.environmental_cognitive_runtime]
  ];
  const active = map.filter(([, rt]) => rt?.consolidation_applied).map(([d]) => d);
  return { domains_active: active.length, signal_learning: active.map((domain) => ({ domain, observed: true })) };
}

module.exports = { learnOperationalSignals };
