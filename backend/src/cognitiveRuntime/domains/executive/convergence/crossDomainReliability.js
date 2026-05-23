'use strict';

function computeCrossDomainReliability(strategic = {}, reliability = {}) {
  return {
    cross_domain_reliable: reliability.organizational_reliable === true,
    domains_aligned: (strategic.convergence ?? 0) >= 0.6
  };
}

module.exports = { computeCrossDomainReliability };
