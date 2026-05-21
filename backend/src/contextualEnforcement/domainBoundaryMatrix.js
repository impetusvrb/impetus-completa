'use strict';

const domainRegistry = require('../domainAuthority/registry/domainRegistry');

const CROSS_DOMAIN_RESTRICTIONS = Object.freeze([
  { from: 'hr', deny_modules: ['environment_intelligence', 'safety_intelligence', 'emissions', 'esg'] },
  { from: 'safety', deny_modules: ['environment_intelligence', 'hr_intelligence'] },
  { from: 'environmental', deny_modules: ['hr_intelligence', 'safety_intelligence'] },
  { from: 'finance', deny_modules: ['manuia', 'environment_intelligence', 'quality_intelligence'] }
]);

function buildDomainBoundaryMatrix(identity = {}) {
  const axis = domainRegistry.normalizeAxis(identity.domain_axis || identity.functional_axis || 'unknown');
  const domain = domainRegistry.getDomain(axis);
  const restrictions = CROSS_DOMAIN_RESTRICTIONS.filter((r) => r.from === axis);

  return {
    domain_axis: axis,
    allowed_modules: domain.allowed_modules || [],
    denied_modules: domain.denied_modules || [],
    exclusive_modules: domain.exclusive_modules || [],
    cross_domain_restrictions: restrictions,
    denied_pipelines: domain.denied_pipelines || [],
    boundary_sealed: restrictions.length > 0,
    enforcement_applied: false
  };
}

module.exports = { buildDomainBoundaryMatrix, CROSS_DOMAIN_RESTRICTIONS };
