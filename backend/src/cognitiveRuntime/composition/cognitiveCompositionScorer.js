'use strict';

const { computeDeliverySemanticScore } = require('../observability/deliverySemanticScore');

const QUALITY_TARGET_BLOCKS = 10;

function scoreComposedCockpit(shadowCockpit = {}, genericSnapshot = {}, ctx = {}) {
  const blockCount = (shadowCockpit.blocks || []).length;
  const genericCount = (genericSnapshot.items || []).length;
  const qualityBlocks = (shadowCockpit.blocks || []).filter((b) =>
    String(b.block_id).startsWith('quality.')
  ).length;

  const semanticCoverage =
    blockCount > 0 ? qualityBlocks / Math.max(blockCount, QUALITY_TARGET_BLOCKS) : 0;

  const genericityRatio =
    genericCount > 0
      ? (genericSnapshot.generic_items || []).length / genericCount
      : 1;

  const dimensions = {
    semantic_alignment: clamp10(semanticCoverage * 10),
    domain_coherence: qualityBlocks >= 6 ? 9 : qualityBlocks >= 4 ? 7 : 4,
    operational_usefulness: shadowCockpit.composition_score?.operational_focus ?? 6,
    contextual_relevance: shadowCockpit.composition_score?.persona_fit ?? 7,
    industrial_genericity: clamp10((1 - genericityRatio) * 10),
    cognitive_signal_strength: blockCount >= 6 ? 8 : 5,
    specialization_delta: clamp10((semanticCoverage - (1 - genericityRatio)) * 10)
  };

  const values = Object.values(dimensions);
  const average = values.reduce((a, b) => a + b, 0) / values.length;

  const genericInspection = {
    domain_axis: ctx.domain_axis || 'quality',
    profile_domain_match: true,
    domain_isolation_ok: true,
    cross_domain_signals: []
  };
  const genericity = {
    genericity_ratio: genericityRatio,
    is_semantically_generic: genericityRatio >= 0.5
  };
  const gap = {
    semantic_coverage_ratio: semanticCoverage,
    missing_semantic_categories: shadowCockpit.composition_gap?.missing_semantic_categories || []
  };
  const legacyScore = computeDeliverySemanticScore(genericInspection, genericity, gap);

  return {
    dimensions,
    average_score: Math.round(average * 10) / 10,
    specialized_score: Math.round(average * 10) / 10,
    generic_baseline_score: legacyScore.average_score,
    delta_vs_generic: Math.round((average - legacyScore.average_score) * 10) / 10,
    interpretation:
      average >= 7
        ? 'specialized_cockpit_strong'
        : average >= 5
          ? 'specialized_cockpit_emerging'
          : 'specialized_cockpit_incomplete'
  };
}

function clamp10(n) {
  return Math.min(10, Math.max(0, n));
}

module.exports = {
  scoreComposedCockpit,
  QUALITY_TARGET_BLOCKS
};
