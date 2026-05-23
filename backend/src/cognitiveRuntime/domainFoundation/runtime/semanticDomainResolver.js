'use strict';

const { resolveDomainFromProfile, getDomainSemanticConstraints } = require('../registry/domainSemanticProfiles');
const { getDomainDefinition } = require('../registry/cognitiveDomainRegistry');

function resolveSemanticDomain(user = {}, payload = {}, ctx = {}) {
  const profileCode = payload.profile_code || ctx.profile_code || '';
  const functionalArea = payload.functional_area || ctx.functional_area || '';
  const domain = resolveDomainFromProfile(profileCode, functionalArea);

  if (!domain) {
    return { domain: null, resolved: false, reason: 'no_matching_domain', semantic_constraints: null };
  }

  const def = getDomainDefinition(domain);
  const constraints = getDomainSemanticConstraints(domain);

  return {
    domain,
    resolved: true,
    label: def?.label || domain,
    maturity: def?.maturity || 'unknown',
    semantic_constraints: constraints,
    cockpit_ready: def?.cockpit_ready === true,
    axis: constraints?.axis || domain
  };
}

function validateSemanticFidelity(domain, blocks = []) {
  const constraints = getDomainSemanticConstraints(domain);
  if (!constraints?.keywords?.length) return { fidelity: 1, off_domain_blocks: [] };

  const offDomain = blocks.filter((b) => {
    const bd = b.domain || '';
    if (bd === domain) return false;
    const tags = (b.metadata?.semantic_tags || b.semantic_tags || []).join(' ');
    return !constraints.keywords.some((k) => tags.includes(k));
  });

  const fidelity = blocks.length > 0 ? Math.round(((blocks.length - offDomain.length) / blocks.length) * 1000) / 1000 : 1;

  return { fidelity, off_domain_blocks: offDomain.map((b) => b.block_id || b.id), off_domain_count: offDomain.length };
}

module.exports = { resolveSemanticDomain, validateSemanticFidelity };
