'use strict';

function computeHrCognitiveHealth({
  specialized_ratio = 0,
  generic_ratio = 0,
  operational_focus = 0,
  usefulness = 0,
  density = {},
  semantic_fidelity = 0.9
} = {}) {
  const specialization = Math.min(1, specialized_ratio);
  const genericity_reduction = Math.min(1, 1 - generic_ratio);
  const operational = Math.min(1, operational_focus);
  const fidelity = Math.min(1, semantic_fidelity);
  const cognitive_density = density?.score != null ? density.score : 0.74;
  const healthy =
    specialization >= 0.45 && fidelity >= 0.7 && genericity_reduction >= 0.35 && operational >= 0.5;

  return {
    hr_cognitive_health: {
      specialization,
      operational_focus: operational,
      semantic_fidelity: fidelity,
      genericity_reduction,
      cognitive_density,
      usefulness_score: usefulness,
      healthy,
      people_centric: true
    }
  };
}

module.exports = { computeHrCognitiveHealth };
