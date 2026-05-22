'use strict';

const { snapshotGenericCockpit } = require('../composition/shadowCockpitBuilder');
const { scoreComposedCockpit } = require('../composition/cognitiveCompositionScorer');

function compareGenericVsSpecialized(payload = {}, shadowCockpit = {}, compositionScore = null) {
  const generic = snapshotGenericCockpit(payload);
  const specializedIds = (shadowCockpit.blocks || []).map((b) => b.block_id);
  const score =
    compositionScore ||
    scoreComposedCockpit(shadowCockpit, generic, {
      domain_axis: shadowCockpit.domain_axis || 'quality',
      profile_code: shadowCockpit.profile_code
    });

  return {
    phase: 'Z.19',
    comparison_type: 'generic_vs_specialized_shadow',
    generic: {
      item_count: generic.item_count,
      genericity_ratio: generic.genericity_ratio,
      items: generic.items
    },
    specialized: {
      block_count: shadowCockpit.block_count,
      block_ids: specializedIds,
      layout: shadowCockpit.layout
    },
    metrics: {
      specialized_score: score.specialized_score,
      generic_baseline_score: score.generic_baseline_score,
      delta_vs_generic: score.delta_vs_generic,
      interpretation: score.interpretation,
      dimensions: score.dimensions
    },
    verdict:
      score.delta_vs_generic > 2
        ? 'specialization_significantly_better'
        : score.delta_vs_generic > 0
          ? 'specialization_improved'
          : 'specialization_neutral',
    legacy_preserved: true,
    render_substitution: false
  };
}

module.exports = {
  compareGenericVsSpecialized
};
