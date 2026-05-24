'use strict';

function computeCognitiveTrustIndex(confidence = {}, utility = {}, inference = {}, feedback = {}) {
  const historical = confidence.historical_confidence ?? 0.5;
  const precision = utility.operational_precision_score ?? 0.5;
  const utilityScore = utility.cognitive_utility_score ?? 0.5;
  const causal = confidence.causal_confidence ?? 0.5;
  const falsePosRate = inference.reliability_metrics?.false_positive_rate ?? 0.1;
  const feedbackCorr = feedback.feedback_operational_correlation ?? 0.35;

  const cognitive_trust_index = Number(
    Math.max(
      0,
      Math.min(
        1,
        historical * 0.25 +
          precision * 0.3 +
          utilityScore * 0.25 +
          causal * 0.15 -
          falsePosRate * 0.15 +
          feedbackCorr * 0.1
      )
    ).toFixed(3)
  );

  let operator_trust_level = 'moderate';
  if (cognitive_trust_index >= 0.75) operator_trust_level = 'high';
  else if (cognitive_trust_index < 0.45) operator_trust_level = 'low';

  return {
    cognitive_trust_index,
    operator_trust_level,
    inference_reliability: inference.inference_truth_score ?? 0.5,
    operational_adoption_score: Number((feedback.operator_engagement_proxy ?? 0.4).toFixed(3)),
    auto_decisions: false
  };
}

module.exports = { computeCognitiveTrustIndex };
