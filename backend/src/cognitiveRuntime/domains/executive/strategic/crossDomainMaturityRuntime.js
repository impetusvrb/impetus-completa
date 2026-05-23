'use strict';

function computeCrossDomainMaturity(enterpriseBundle = {}) {
  const domains = enterpriseBundle.domains || {};
  const nativeCount = Object.values(domains).filter((d) => d.present).length;
  return {
    native_domains_present: nativeCount,
    maturity_index: enterpriseBundle.enterprise?.maturity_index ?? 72,
    cockpit_ready_domains: nativeCount,
    enterprise_consolidated: nativeCount >= 4
  };
}

module.exports = { computeCrossDomainMaturity };
