'use strict';

const { isolateNarrativeByDomain } = require('./narrativeDomainIsolation');

function protectSummaryLeakage(payload = {}, ctx = {}) {
  const iso = isolateNarrativeByDomain(payload, ctx);
  return {
    payload: iso.payload,
    leakage_detected: iso.isolation_observed,
    hints: iso.cross_domain_hints,
    auto_remediate: false,
    observability_only: !ctx.enforcement_applied
  };
}

module.exports = { protectSummaryLeakage };
