/**
 * Z.24 — Multi-Domain Resolver (frontend).
 * Consome `multi_domain_foundation` de /dashboard/me e resolve
 * o domínio cognitivo para composição do cockpit.
 */

export function resolveMultiDomainContext(meData = {}) {
  const mdf = meData.multi_domain_foundation;
  if (!mdf || !mdf.foundation_active) {
    return { active: false, domain: null, blocks: [], ready: false };
  }

  return {
    active: true,
    domain: mdf.domain,
    domain_label: mdf.domain_label,
    cockpit_ready: mdf.cockpit_ready,
    blocks: mdf.cognitive_blocks || meData.cognitive_blocks || [],
    blended_weights: mdf.blended_weights,
    semantic_fidelity: mdf.semantic_fidelity,
    health: mdf.multi_domain_cognitive_health,
    operational_focus: mdf.operational_focus,
    ready_domains: mdf.ready_domains || [],
    ready: mdf.cockpit_ready === true
  };
}

export function getActiveDomain(meData) {
  const ctx = resolveMultiDomainContext(meData);
  return ctx.active ? ctx.domain : null;
}
