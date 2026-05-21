'use strict';

const domainRegistry = require('../domainAuthority/registry/domainRegistry');

function resolveFunctionalDomain(user = {}, ctx = {}) {
  let axis = ctx.functional_axis || user.functional_axis || user.functional_area;
  try {
    const semantic = require('../domainAuthority/resolvers/semanticDomainResolver');
    const pack = semantic.resolveSemanticAxis(user);
    axis = pack.functional_axis || axis;
  } catch {
    /* fallback */
  }
  const normalized = domainRegistry.normalizeAxis(axis || 'unknown');
  const domain = domainRegistry.getDomain(normalized);

  return {
    functional_axis: axis || 'unknown',
    domain_axis: normalized,
    domain_label: domain.axis,
    departments: user.department ? [user.department] : domain.departments || [],
    semantic_keywords: domain.semantic_keywords || []
  };
}

module.exports = { resolveFunctionalDomain };
