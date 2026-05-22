'use strict';

const { buildCompositionContext } = require('./compositionContextBuilder');
const { resolveEligibleBlocks } = require('./compositionEligibilityResolver');
const { listQualityPilotBlocks } = require('./cognitiveBlockResolver');
const { rankBlocksByOperationalWeight } = require('./operationalWeightResolver');
const flagsZ19 = require('../config/phaseZ19FeatureFlags');

const MAX_QUALITY_VISIBLE = 8;

/**
 * Motor contextual — resolve blocos elegíveis + weighting sem mutar delivery.
 */
function runContextualComposition(user = {}, payload = {}, ctx = {}) {
  const compositionCtx = buildCompositionContext(user, payload, ctx);
  const domainAxis = compositionCtx.domain_axis || 'quality';

  let resolved;
  if (domainAxis === 'quality' && flagsZ19.isQualityCockpitShadowActive()) {
    const pilotResolved = listQualityPilotBlocks(compositionCtx);
    const blocks = pilotResolved.map((r) => r.block);
    const ranked = rankBlocksByOperationalWeight(blocks, compositionCtx);
    resolved = {
      source: 'quality_pilot_pack',
      domain_axis: 'quality',
      eligible_blocks: ranked.slice(0, MAX_QUALITY_VISIBLE).map((entry, idx) => ({
        block_id: entry.block.id,
        semantic_category: entry.block.semantic_category,
        relevance_score: entry.weight.composite_weight_score,
        rank: idx + 1,
        operational_weight: entry.weight
      })),
      rejected_blocks: pilotResolved.filter((r) => !r.eligible).map((r) => ({
        block_id: r.block_id,
        rejection_reasons: ['authority_denied']
      }))
    };
  } else {
    const eligibility = resolveEligibleBlocks(compositionCtx);
    const blockObjs = eligibility.eligible_blocks
      .map((e) => require('../registry/cognitiveBlockRegistry').getBlockById(e.block_id))
      .filter(Boolean);
    const ranked = rankBlocksByOperationalWeight(blockObjs, compositionCtx);
    resolved = {
      source: 'domain_registry',
      domain_axis: domainAxis,
      eligible_blocks: ranked.slice(0, MAX_QUALITY_VISIBLE).map((entry, idx) => ({
        block_id: entry.block.id,
        semantic_category: entry.block.semantic_category,
        relevance_score: entry.weight.composite_weight_score,
        rank: idx + 1,
        operational_weight: entry.weight
      })),
      rejected_blocks: eligibility.rejected_blocks
    };
  }

  const weights = require('./operationalWeightResolver').resolveOperationalWeights(compositionCtx);

  return {
    phase: 'Z.19',
    composition_ctx: compositionCtx,
    domain_axis: domainAxis,
    profile_code: compositionCtx.profile_code,
    hierarchy_tier: compositionCtx.hierarchy_tier,
    governance_locked: compositionCtx.governance_locked,
    operational_weighting: weights,
    composition_result: resolved,
    recommended_block_ids: resolved.eligible_blocks.map((b) => b.block_id),
    delivery_mutation: false
  };
}

module.exports = {
  runContextualComposition,
  MAX_QUALITY_VISIBLE
};
