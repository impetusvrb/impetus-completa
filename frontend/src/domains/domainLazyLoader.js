/**
 * WAVE 6 — Lazy loading agrupado por domínio.
 * Permite carregar chunks de domínio isolados sem alterar App.jsx.
 */

import { lazy } from 'react';

/**
 * Regista um componente lazy de domínio com fallback seguro.
 * @param {() => Promise<{ default: React.ComponentType }>} factory
 * @param {string} domainId
 */
export function domainLazy(factory, domainId) {
  return lazy(() =>
    factory().catch((err) => {
      console.warn(`[DOMAIN_LAZY] Failed to load domain "${domainId}":`, err?.message || err);
      return { default: () => null };
    })
  );
}

/**
 * Pré-carrega chunk de domínio em background (hover / idle).
 * @param {() => Promise<unknown>} factory
 * @param {string} domainId
 */
export function prefetchDomainChunk(factory, domainId) {
  const prefetched = prefetchDomainChunk._set || (prefetchDomainChunk._set = new Set());
  if (prefetched.has(domainId)) return;
  prefetched.add(domainId);
  factory().catch(() => {});
}

/**
 * Mapa de placeholders para domínios industriais futuros.
 * Substituir quando os chunks reais forem criados.
 */
export const DOMAIN_CHUNK_FACTORIES = {
  quality: () => import(/* webpackChunkName: "domain-quality" */ './quality/routes/qualityDomainPrefetch.js'),
  safety: () => import(/* webpackChunkName: "domain-safety" */ './safety/routes/safetyDomainPrefetch.js'),
  environment: () =>
    import(/* webpackChunkName: "domain-environment" */ './placeholders/EnvironmentPlaceholder'),
  logistics: () =>
    import(/* webpackChunkName: "domain-logistics" */ './placeholders/LogisticsPlaceholder')
};
