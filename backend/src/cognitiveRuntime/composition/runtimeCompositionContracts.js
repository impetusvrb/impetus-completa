'use strict';

const COMPOSITION_CONTRACT_VERSION = '1.0.0';

/**
 * Contrato de composição runtime — cockpit = composição cognitiva governada.
 * Não altera delivery actual; define regras para shadow plan.
 */
const RUNTIME_COMPOSITION_CONTRACT = Object.freeze({
  version: COMPOSITION_CONTRACT_VERSION,
  phase: 'Z.18',
  mode: 'shadow_only',
  max_visible_blocks: 8,
  min_domain_semantic_blocks: 3,
  require_domain_owner_match: true,
  respect_terminal_governance_lock: true,
  respect_denied_publications: true,
  allow_cross_domain_blocks: false,
  fallback_to_generic_cockpit: true,
  fallback_banner: 'semantic_composition_pending',
  composition_formula: 'cockpit = Σ(eligible_blocks × persona_weight × authority_grant)',
  channels: Object.freeze({
    widgets: { enabled: false, shadow: true },
    kpis: { enabled: false, shadow: true },
    summary: { enabled: false, shadow: true },
    narrative: { enabled: false, shadow: true }
  })
});

function validateCompositionPlan(plan = {}) {
  const errors = [];
  if (!plan.domain_axis) errors.push('missing_domain_axis');
  if (!Array.isArray(plan.eligible_blocks)) errors.push('eligible_blocks_must_be_array');
  if (plan.eligible_blocks?.length > RUNTIME_COMPOSITION_CONTRACT.max_visible_blocks) {
    errors.push('exceeds_max_visible_blocks');
  }
  return { valid: errors.length === 0, errors, contract: RUNTIME_COMPOSITION_CONTRACT };
}

module.exports = {
  COMPOSITION_CONTRACT_VERSION,
  RUNTIME_COMPOSITION_CONTRACT,
  validateCompositionPlan
};
