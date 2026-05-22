'use strict';

const {
  getPersonaWeighting,
  scoreBlockRelevanceForPersona,
  PERSONA_WEIGHTING
} = require('../registry/cognitiveBlockHierarchy');
const { resolveHierarchyTier } = require('../registry/cognitiveBlockAuthority');

/**
 * Weighting operacional por persona — roadmap ETAPA 6.
 * Tenant override: stub para fase futura (sem mutação automática).
 */
function resolveOperationalWeights(ctx = {}) {
  const tier = resolveHierarchyTier(ctx);
  const base = getPersonaWeighting(ctx);
  const tenantOverride = ctx.tenant_weight_override || null;

  if (tenantOverride && typeof tenantOverride === 'object') {
    const op = Number(tenantOverride.operational ?? base.operational);
    const mgmt = Number(tenantOverride.management ?? base.management);
    const strat = Number(tenantOverride.strategic ?? base.strategic);
    const sum = op + mgmt + strat || 1;
    return {
      tier,
      operational: op / sum,
      management: mgmt / sum,
      strategic: strat / sum,
      source: 'tenant_override'
    };
  }

  return {
    tier,
    operational: base.operational,
    management: base.management,
    strategic: base.strategic,
    source: 'persona_default'
  };
}

function applyOperationalWeightToBlock(block, ctx = {}) {
  const weights = resolveOperationalWeights(ctx);
  const blockRelevance = scoreBlockRelevanceForPersona(block, ctx);
  const h = block.hierarchy || {};
  const layerMix =
    (h.operational_weight || 0) * weights.operational +
    (h.management_weight || 0) * weights.management +
    (h.strategic_weight || 0) * weights.strategic;

  const composite_score = Math.min(1, blockRelevance * (0.6 + layerMix * 0.4));

  return {
    block_id: block.id,
    persona_tier: weights.tier,
    persona_weighting: weights,
    block_relevance: blockRelevance,
    layer_mix: layerMix,
    composite_weight_score: Math.round(composite_score * 1000) / 1000
  };
}

function rankBlocksByOperationalWeight(blocks, ctx = {}) {
  return blocks
    .map((b) => ({
      block: b,
      weight: applyOperationalWeightToBlock(b, ctx)
    }))
    .sort((a, b) => b.weight.composite_weight_score - a.weight.composite_weight_score);
}

module.exports = {
  PERSONA_WEIGHTING,
  resolveOperationalWeights,
  applyOperationalWeightToBlock,
  rankBlocksByOperationalWeight
};
