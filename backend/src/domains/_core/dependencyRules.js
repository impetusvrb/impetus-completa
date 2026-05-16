'use strict';

/**
 * WAVE 5 — regras declarativas de dependência entre bounded contexts.
 */

const DOMAIN_IDS = Object.freeze(['quality', 'safety', 'environment', 'logistics', 'operational', 'platform']);

const ALLOWED_EDGES = Object.freeze([
  { from: 'quality', to: 'shared', via: 'direct' },
  { from: 'quality', to: 'logistics', via: 'acl' },
  { from: 'logistics', to: 'shared', via: 'direct' },
  { from: 'logistics', to: 'quality', via: 'acl' },
  { from: 'safety', to: 'shared', via: 'direct' },
  { from: 'environment', to: 'shared', via: 'direct' },
  { from: 'operational', to: 'shared', via: 'direct' },
  { from: 'platform', to: 'shared', via: 'direct' }
]);

/**
 * @param {string} fromDomain
 * @param {string} toDomain
 * @param {{ via?: string }} [ctx]
 */
function isImportAllowed(fromDomain, toDomain, ctx = {}) {
  const from = String(fromDomain || '').toLowerCase();
  const to = String(toDomain || '').toLowerCase();

  if (from === to) return { allowed: true, reason: 'same_domain' };
  if (to === 'shared' || to === '_core' || to === 'platform') return { allowed: true, reason: 'shared_kernel' };

  const via = ctx.via || 'direct';
  const edge = ALLOWED_EDGES.find((e) => e.from === from && e.to === to && e.via === via);
  if (edge) return { allowed: true, reason: `edge_${via}` };

  return { allowed: false, reason: 'cross_domain_forbidden', from, to, via };
}

function getDependencyMatrix() {
  return {
    domains: [...DOMAIN_IDS],
    edges: ALLOWED_EDGES.map((e) => ({ ...e }))
  };
}

module.exports = {
  DOMAIN_IDS,
  ALLOWED_EDGES,
  isImportAllowed,
  getDependencyMatrix
};
