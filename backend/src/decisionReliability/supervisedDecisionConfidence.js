'use strict';

function computeSupervisedDecisionConfidence(signals = {}) {
  const risk = (signals.low_trust ? 0.35 : 0) + (signals.high_ambiguity ? 0.3 : 0) + (signals.weak_guidance ? 0.2 : 0);
  const supervision_recommendation_score = Number(Math.min(1, risk).toFixed(4));
  return {
    supervision_recommendation_score,
    recommend_human_oversight: supervision_recommendation_score >= 0.5,
    escalate_recommended: supervision_recommendation_score >= 0.75
  };
}

module.exports = { computeSupervisedDecisionConfidence };
