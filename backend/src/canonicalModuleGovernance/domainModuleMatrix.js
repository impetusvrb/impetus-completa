'use strict';

const { getCanonicalAllowSet, getCanonicalDenySet, resolveDomainProfile } = require('./canonicalModuleMatrix');
const { normalizeModuleId } = require('./moduleAliasRegistry');

function isModuleAllowedByDomain(moduleId, domainAxis) {
  const key = normalizeModuleId(moduleId);
  const deny = getCanonicalDenySet(domainAxis);
  if (deny.has(key)) return { allowed: false, reason: 'domain_denied', domain_axis: domainAxis };
  const allow = getCanonicalAllowSet(domainAxis);
  const profile = resolveDomainProfile(domainAxis);
  if (!profile) return { allowed: true, reason: 'unknown_domain_permissive' };
  if (allow.has(key)) return { allowed: true, reason: 'domain_allowed' };
  return { allowed: false, reason: 'not_in_domain_allowlist', domain_axis: domainAxis };
}

module.exports = { isModuleAllowedByDomain };
