'use strict';

const DOMAIN_ALIASES = {
  rh: 'hr',
  qualidade: 'quality',
  manutencao: 'operations',
  sst: 'safety',
  environmental: 'environmental',
  esg: 'environmental'
};

function normalizeDomain(raw) {
  const d = String(raw || 'general').toLowerCase();
  return DOMAIN_ALIASES[d] || d;
}

function resolveDomainTargeting(user, ctx = {}) {
  const axis = normalizeDomain(ctx.functional_axis || user?.functional_axis || user?.functional_area);
  return {
    domain: axis,
    domain_targeting_precision: axis !== 'general' ? 0.92 : 0.65,
    isolated: axis !== 'general'
  };
}

module.exports = { resolveDomainTargeting, normalizeDomain, DOMAIN_ALIASES };
