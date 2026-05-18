'use strict';

/**
 * Tenant domain overrides — preparação estrutural (Fase C.7).
 * Não altera comportamento actual até activação por feature flag.
 *
 *   IMPETUS_DOMAIN_TENANT_OVERRIDES=on
 */

const domainRegistry = require('../registry/domainRegistry');

function isEnabled() {
  return String(process.env.IMPETUS_DOMAIN_TENANT_OVERRIDES || 'off').toLowerCase() === 'on';
}

/**
 * @param {string} companyId
 * @param {string} axis
 * @returns {object|null} override parcial ou null
 */
function loadTenantDomainOverride(companyId, axis) {
  if (!isEnabled() || !companyId) return null;
  // Reservado: SELECT from tenant_domain_overrides (migration futura)
  return null;
}

/**
 * Aplica overrides aditivos ao domínio base (sem mutar registry global).
 */
function mergeDomainWithOverride(baseDomain, override) {
  if (!override || typeof override !== 'object') return baseDomain;
  return {
    ...baseDomain,
    allowed_modules: _union(baseDomain.allowed_modules, override.allowed_modules),
    denied_modules: _union(baseDomain.denied_modules, override.denied_modules),
    semantic_keywords: _union(baseDomain.semantic_keywords, override.semantic_keywords),
    dashboards: _union(baseDomain.dashboards, override.dashboards)
  };
}

function _union(a, b) {
  const s = new Set([...(a || []), ...(b || [])]);
  return [...s];
}

function resolveDomainForTenant(companyId, axis) {
  const base = domainRegistry.getDomain(axis);
  const ov = loadTenantDomainOverride(companyId, axis);
  return mergeDomainWithOverride(base, ov);
}

module.exports = {
  isEnabled,
  loadTenantDomainOverride,
  mergeDomainWithOverride,
  resolveDomainForTenant
};
