'use strict';

const flagsZ24 = require('../../config/phaseZ24FeatureFlags');
const { resolveMultiDomainCockpit } = require('./multiDomainCockpitResolver');
const { composeBlocksForDomain } = require('./domainCompositionRuntime');
const { filterBlocksByDomainIsolation } = require('./crossDomainProtection');
const { balanceWeightsForProfile, rankBlocksByWeight } = require('./domainWeightBalancer');
const { validateSemanticFidelity } = require('./semanticDomainResolver');

function superviseComposition(user = {}, payload = {}, ctx = {}) {
  const resolution = resolveMultiDomainCockpit(user, payload, ctx);
  if (!resolution.resolved) {
    return { ok: false, reason: resolution.reason, composition: null };
  }

  const domain = resolution.domain;
  const composition = composeBlocksForDomain(domain, payload.profile_code || ctx.profile_code || '');
  const { blocks: isolated, violations } = filterBlocksByDomainIsolation(domain, composition.composed_blocks);
  const weights = balanceWeightsForProfile(domain, payload.profile_code || '');
  const ranked = rankBlocksByWeight(isolated, weights.blended);
  const fidelity = validateSemanticFidelity(domain, ranked);

  return {
    ok: true,
    domain,
    domain_label: resolution.domain_label,
    maturity: resolution.maturity,
    cockpit_ready: resolution.cockpit_ready,
    persona_tier: resolution.persona_tier,
    composed_blocks: ranked,
    block_count: ranked.length,
    blended_weights: weights.blended,
    isolation: { violations, violation_count: violations.length },
    semantic_fidelity: fidelity.fidelity,
    off_domain_blocks: fidelity.off_domain_blocks,
    foundation_mode: resolution.foundation_mode,
    ready_domains: resolution.ready_domains
  };
}

module.exports = { superviseComposition };
