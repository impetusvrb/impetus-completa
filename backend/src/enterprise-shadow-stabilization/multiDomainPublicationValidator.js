'use strict';

const runtime = require('../runtime-validation/enterpriseRuntimeValidationEngine');

const CORE_PATHS = Object.freeze(['/app', '/app/chatbot', '/chat']);

/**
 * Validação publication multi-domínio (quality, safety, logistics + IA/Chat/Dashboard).
 */
function validateMultiDomainPublication(ctx = {}) {
  const snap = runtime.validateEnterpriseRuntime(ctx);
  const domains = {
    quality: {
      navigation: snap.flags?.quality?.navigation,
      publication: snap.flags?.quality?.publication,
      shadow: snap.flags?.quality?.universal_shadow,
      routes: snap.manifests?.quality_route_count ?? 0
    },
    safety: {
      operational: snap.flags?.safety?.operational,
      publication: snap.flags?.safety?.publication,
      shadow: snap.flags?.safety?.publication_shadow,
      routes: snap.manifests?.safety_route_count ?? 0
    },
    logistics: {
      operational: snap.flags?.logistics?.operational,
      publication: snap.flags?.logistics?.publication,
      shadow: snap.flags?.logistics?.publication_shadow,
      routes: snap.manifests?.logistics_route_count ?? 0
    },
    environment: {
      operational: snap.flags?.environment?.operational,
      publication: snap.flags?.environment?.publication,
      shadow: snap.flags?.environment?.publication_shadow,
      routes: snap.manifests?.environment_route_count ?? 0
    },
    ia_chat: { preserved: true, paths: CORE_PATHS.filter((p) => p.includes('chat')) },
    dashboard: { preserved: true, path: '/app' }
  };

  const publication_stable =
    snap.stable &&
    snap.conflicts.length === 0 &&
    snap.legacy_coexistence &&
    snap.fallback_navigation_preserved;

  return {
    ok: true,
    publication_stable,
    runtime_snapshot: snap,
    domains,
    cross_collisions: snap.manifests?.cross_collisions || [],
    bounded_publication: true,
    safe_merge_required: true,
    pipeline_order: ['quality', 'safety', 'logistics', 'environment']
  };
}

module.exports = { validateMultiDomainPublication, CORE_PATHS };
