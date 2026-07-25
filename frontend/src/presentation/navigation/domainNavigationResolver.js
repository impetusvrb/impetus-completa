/**
 * NAV-001 — Domain Navigation Resolver (context-aware sidebar domains).
 */
import { ALLOWED_DOMAIN_RULES, PRESENTATION_DOMAIN_IDS } from './allowedDomainRegistry.js';
import { resolveSidebarNavigationContext } from './sidebarContextResolver.js';

/**
 * Avalia cada domínio individualmente — proibido merge(allDomains).
 * @param {object} rawCtx — parâmetros do Layout / presentation merge
 * @returns {readonly string[]}
 */
export function resolveAllowedPresentationDomains(rawCtx = {}) {
  const ctx = resolveSidebarNavigationContext(rawCtx);
  if (ctx.suppressDomainSections) return Object.freeze([]);

  /** @type {string[]} */
  const allowed = [];
  for (const domainId of PRESENTATION_DOMAIN_IDS) {
    const rule = ALLOWED_DOMAIN_RULES[domainId];
    if (!rule) continue;
    try {
      if (rule.isAllowed(ctx)) allowed.push(domainId);
    } catch {
      /* fail-closed por domínio */
    }
  }
  return Object.freeze(allowed);
}

/**
 * @param {string} domainId
 * @param {object} rawCtx
 */
export function isPresentationDomainAllowed(domainId, rawCtx = {}) {
  return resolveAllowedPresentationDomains(rawCtx).includes(domainId);
}

/**
 * Snapshot para telemetria / testes.
 * @param {object} rawCtx
 */
export function getDomainNavigationResolutionSnapshot(rawCtx = {}) {
  const ctx = resolveSidebarNavigationContext(rawCtx);
  const allowed = resolveAllowedPresentationDomains(rawCtx);
  return Object.freeze({
    phase: 'NAV-001',
    allowedDomains: allowed,
    suppressDomainSections: ctx.suppressDomainSections,
    functionalSignals: ctx.functionalSignals,
    visibleModules: ctx.visibleModules
  });
}
