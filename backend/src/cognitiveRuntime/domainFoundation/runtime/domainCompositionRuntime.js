'use strict';

const { getBlocksByDomainWithWeight } = require('../registry/domainBlockRegistry');
const { buildCompositionConfig } = require('../registry/cockpitCompositionRegistry');

function composeBlocksForDomain(domain, profileCode, opts = {}) {
  const config = buildCompositionConfig(domain, profileCode);
  const blocks = getBlocksByDomainWithWeight(domain, config.persona_tier);
  const maxBlocks = opts.max_blocks ?? config.density.max_centers ?? 8;

  const composed = blocks.slice(0, maxBlocks).map((b, i) => ({
    block_id: b.id,
    domain: b.domain,
    label: b.label,
    semantic_layer: b.semantic_layer,
    domain_weight: b.domain_weight,
    effective_score: b.effective_score,
    composition_rank: i,
    render_slot: null
  }));

  return {
    domain,
    profile_code: profileCode,
    persona_tier: config.persona_tier,
    blended_weights: config.blended_weights,
    composed_blocks: composed,
    block_count: composed.length,
    maturity: config.maturity,
    cockpit_ready: config.cockpit_ready
  };
}

module.exports = { composeBlocksForDomain };
