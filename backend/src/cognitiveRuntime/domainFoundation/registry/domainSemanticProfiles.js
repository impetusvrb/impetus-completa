'use strict';

const { getDomainDefinition, listDomains } = require('./cognitiveDomainRegistry');

function resolveDomainFromProfile(profileCode = '', functionalArea = '') {
  const pc = String(profileCode).toLowerCase();
  const fa = String(functionalArea).toLowerCase();

  for (const domain of listDomains()) {
    const def = getDomainDefinition(domain);
    if (!def) continue;
    if ((def.pilot_profiles || []).some((p) => pc.includes(p) || p.includes(pc))) return domain;
    if (def.semantic_constraints?.axis && fa === def.semantic_constraints.axis) return domain;
    if ((def.semantic_constraints?.keywords || []).some((k) => pc.includes(k) || fa.includes(k))) return domain;
  }

  if (pc.includes('executive') || pc.includes('ceo') || pc.includes('cfo')) return 'executive';
  return null;
}

function getDomainSemanticConstraints(domain) {
  const def = getDomainDefinition(domain);
  return def?.semantic_constraints || { keywords: [], axis: domain };
}

function isProfileMatchingDomain(profileCode, domain) {
  const def = getDomainDefinition(domain);
  if (!def) return false;
  const pc = String(profileCode || '').toLowerCase();
  return (def.pilot_profiles || []).some((p) => pc === p || pc.includes(p) || p.includes(pc));
}

module.exports = {
  resolveDomainFromProfile,
  getDomainSemanticConstraints,
  isProfileMatchingDomain
};
