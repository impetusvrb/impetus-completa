'use strict';

/**
 * Modelo de módulos partilhados governados — sem heurística textual.
 */

const CLASSIFICATION = {
  EXCLUSIVE: 'exclusive',
  SHARED_GOVERNED: 'shared_governed',
  CROSS_DOMAIN_SAFE: 'cross_domain_safe',
  OPERATIONAL_ONLY: 'operational_only',
  EXECUTIVE_ONLY: 'executive_only',
  TECHNICAL_ONLY: 'technical_only',
  TENANT_OPTIONAL: 'tenant_optional'
};

const MODULE_REGISTRY = {
  dashboard: { classification: CLASSIFICATION.CROSS_DOMAIN_SAFE, domains: ['*'] },
  sst: { classification: CLASSIFICATION.EXCLUSIVE, domains: ['safety'], axis: 'safety' },
  quality: { classification: CLASSIFICATION.EXCLUSIVE, domains: ['quality'], axis: 'quality' },
  qualidade: { classification: CLASSIFICATION.EXCLUSIVE, domains: ['quality'], axis: 'quality' },
  environment_intelligence: { classification: CLASSIFICATION.EXCLUSIVE, domains: ['environmental'], axis: 'environmental' },
  esg: { classification: CLASSIFICATION.EXCLUSIVE, domains: ['environmental'], axis: 'environmental' },
  hr: { classification: CLASSIFICATION.EXCLUSIVE, domains: ['hr'], axis: 'hr' },
  rh: { classification: CLASSIFICATION.EXCLUSIVE, domains: ['hr'], axis: 'hr' },
  executive: { classification: CLASSIFICATION.EXECUTIVE_ONLY, domains: ['executive'], axis: 'executive' },
  telemetry: { classification: CLASSIFICATION.TECHNICAL_ONLY, domains: ['technical'], axis: 'technical' },
  connectors: { classification: CLASSIFICATION.TECHNICAL_ONLY, domains: ['technical'], axis: 'technical' },
  maintenance: { classification: CLASSIFICATION.OPERATIONAL_ONLY, domains: ['operations', 'maintenance'], axis: 'operations' },
  manutencao: { classification: CLASSIFICATION.OPERATIONAL_ONLY, domains: ['operations'], axis: 'operations' },
  reports: { classification: CLASSIFICATION.SHARED_GOVERNED, domains: ['quality', 'safety', 'executive'], axis: null },
  analytics: { classification: CLASSIFICATION.SHARED_GOVERNED, domains: ['executive', 'quality'], axis: null }
};

function getModuleClassification(moduleId) {
  const id = String(moduleId || '').toLowerCase().replace(/^mod_/, '');
  return MODULE_REGISTRY[id] || {
    classification: CLASSIFICATION.TENANT_OPTIONAL,
    domains: [],
    axis: null,
    unknown: true
  };
}

function isModuleAllowedForContext(moduleId, ctx = {}) {
  const def = getModuleClassification(moduleId);
  const axis = ctx.functional_axis || ctx.axis || ctx.domain;
  const domain = ctx.domain || axis;

  if (def.classification === CLASSIFICATION.CROSS_DOMAIN_SAFE) return { allowed: true, reason: 'cross_domain_safe' };
  if (def.classification === CLASSIFICATION.TENANT_OPTIONAL) return { allowed: true, reason: 'tenant_optional' };

  if (def.classification === CLASSIFICATION.EXCLUSIVE) {
    const ok = !def.axis || def.axis === axis || (def.domains || []).includes(domain);
    return { allowed: ok, reason: ok ? 'exclusive_match' : 'exclusive_domain_mismatch', def };
  }

  if (def.classification === CLASSIFICATION.EXECUTIVE_ONLY) {
    return { allowed: axis === 'executive' || domain === 'executive', reason: 'executive_scope', def };
  }

  if (def.classification === CLASSIFICATION.TECHNICAL_ONLY) {
    return {
      allowed: axis === 'technical' || ctx.is_internal_admin === true,
      reason: 'technical_scope',
      def
    };
  }

  if (def.classification === CLASSIFICATION.OPERATIONAL_ONLY) {
    const ops = ['operations', 'maintenance', 'safety', 'quality'];
    return { allowed: ops.includes(axis) || ops.includes(domain), reason: 'operational_scope', def };
  }

  if (def.classification === CLASSIFICATION.SHARED_GOVERNED) {
    const ok = !domain || (def.domains || []).includes(domain) || (def.domains || []).includes(axis);
    return { allowed: ok, reason: ok ? 'shared_governed_ok' : 'shared_governed_denied', def };
  }

  return { allowed: true, reason: 'default_allow' };
}

module.exports = {
  CLASSIFICATION,
  MODULE_REGISTRY,
  getModuleClassification,
  isModuleAllowedForContext
};
