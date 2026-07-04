'use strict';

/**
 * SEC-03 — Métricas de Threat Intelligence.
 */

const counters = {
  threat_profiles: 0,
  campaign_assessments: 0,
  historical_matches: 0,
  unknown_profiles: 0,
  assessment_errors: 0
};

const providerStats = new Map();
const asnStats = new Map();

function increment(name, n = 1) {
  if (Object.prototype.hasOwnProperty.call(counters, name)) counters[name] += n;
}

function recordProvider(providerId) {
  providerStats.set(providerId, (providerStats.get(providerId) || 0) + 1);
}

function recordAsn(asn) {
  const key = String(asn);
  asnStats.set(key, (asnStats.get(key) || 0) + 1);
}

function getSnapshot() {
  return {
    ...counters,
    provider_statistics: Object.fromEntries(providerStats),
    asn_statistics: Object.fromEntries(asnStats)
  };
}

function resetForTests() {
  Object.keys(counters).forEach((k) => { counters[k] = 0; });
  providerStats.clear();
  asnStats.clear();
}

module.exports = {
  increment,
  recordProvider,
  recordAsn,
  getSnapshot,
  resetForTests
};
