'use strict';

function analyzeContextualUncertainty(ctx = {}) {
  const uncertain =
    ctx.ambiguous_targeting ||
    ctx.canonical_axis === 'general' ||
    !ctx.canonical_axis ||
    (ctx.cognitive_consistency_score != null && ctx.cognitive_consistency_score < 0.65);
  return {
    contextual_uncertainty: uncertain,
    uncertainty_score: uncertain ? 0.65 : 0.15,
    determinability: uncertain ? 'low' : 'adequate'
  };
}

module.exports = { analyzeContextualUncertainty };
