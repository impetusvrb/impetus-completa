'use strict';

const { isModuleAllowedForContext } = require('../semanticGovernance/governedSharedModules');
const { normalizeDomain } = require('./contextualDomainTargeting');

const DOMAIN_PAIRS_CONFLICT = [
  ['hr', 'quality'],
  ['hr', 'safety'],
  ['quality', 'environmental'],
  ['safety', 'environmental'],
  ['financial', 'operations'],
  ['logistics', 'quality']
];

function detectFunctionalContamination(moduleId, userDomain, exposedDomain) {
  const u = normalizeDomain(userDomain);
  const e = normalizeDomain(exposedDomain);
  if (u === e) return false;
  return DOMAIN_PAIRS_CONFLICT.some(([a, b]) => (a === u && b === e) || (b === u && a === e));
}

function isolateFunctionalModule(moduleId, ctx = {}) {
  const check = isModuleAllowedForContext(moduleId, ctx);
  const contaminated = ctx.exposed_domain && detectFunctionalContamination(moduleId, ctx.functional_axis, ctx.exposed_domain);
  return {
    module_id: moduleId,
    allowed: check.allowed && !contaminated,
    reason: contaminated ? 'functional_contamination' : check.reason,
    domain: normalizeDomain(ctx.functional_axis)
  };
}

module.exports = { isolateFunctionalModule, detectFunctionalContamination, DOMAIN_PAIRS_CONFLICT };
