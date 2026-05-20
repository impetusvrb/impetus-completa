'use strict';

function assembleSemanticTruth(authorityTruth, composition) {
  const axis = authorityTruth?.contextual_truth?.functional_axis || composition?.composition?.operational?.functional_axis;
  return {
    semantic_state: {
      axis,
      assembly_version: 1,
      sources: ['contextual_truth_authority', 'governed_context_composition']
    },
    semantic_convergence_rate: Number(
      ((authorityTruth?.runtime_truth_confidence || 0.7) + (composition?.contextual_unification_score || 0.7)) / 2
    ).toFixed(4),
    aligned_modules: composition?.composition?.operational?.visible_modules || []
  };
}

module.exports = { assembleSemanticTruth };
