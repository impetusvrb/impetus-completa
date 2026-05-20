'use strict';

const { normalizeDomain } = require('./contextualDomainTargeting');

function resolveOperationalDomain(user, ctx = {}) {
  const domain = normalizeDomain(ctx.functional_axis || user?.functional_axis || user?.functional_area);
  const department = String(user?.department || '').toLowerCase();
  let inferred = domain;
  if (domain === 'general' && department) {
    if (department.includes('rh') || department.includes('hr')) inferred = 'hr';
    if (department.includes('qual')) inferred = 'quality';
    if (department.includes('sst') || department.includes('seg')) inferred = 'safety';
  }
  return { domain: inferred, inferred_from_department: inferred !== domain };
}

module.exports = { resolveOperationalDomain };
