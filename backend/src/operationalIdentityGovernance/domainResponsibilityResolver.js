'use strict';

const { normalizeOrganizationalRole } = require('./organizationalRoleNormalizer');

const DOMAIN_ALIASES = Object.freeze({
  qualidade: 'quality',
  qc: 'quality',
  qa: 'quality',
  rh: 'hr',
  'recursos humanos': 'hr',
  sst: 'safety',
  seguranca: 'safety',
  'segurança do trabalho': 'safety',
  ambiental: 'environmental',
  meio_ambiente: 'environmental',
  producao: 'production',
  produção: 'production'
});

function resolveDomainResponsibility(user = {}, ctx = {}, baseDomain = {}) {
  const normalized = normalizeOrganizationalRole(user, ctx);
  if (normalized.matched && normalized.domain_axis) {
    return {
      ...baseDomain,
      domain_axis: normalized.domain_axis,
      functional_axis: normalized.domain_axis,
      domain_label: normalized.domain_axis,
      functional_role: normalized.functional_role,
      mapped_from: normalized.mapping_id,
      governance_applied: true
    };
  }

  const dept = String(user.department || ctx.department || '').toLowerCase().trim();
  for (const [key, axis] of Object.entries(DOMAIN_ALIASES)) {
    if (dept.includes(key)) {
      return {
        ...baseDomain,
        domain_axis: axis,
        functional_axis: axis,
        mapped_from: `department:${key}`,
        governance_applied: true
      };
    }
  }

  return { ...baseDomain, governance_applied: false };
}

module.exports = { DOMAIN_ALIASES, resolveDomainResponsibility };
