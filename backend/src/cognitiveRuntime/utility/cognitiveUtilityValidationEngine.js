'use strict';

function validateCognitiveUtility(payload = {}, inference = {}) {
  const questions = [
    ...(payload.quality_contextual_questions || []),
    ...(payload.production_contextual_questions || []),
    ...(payload.maintenance_contextual_questions || [])
  ];
  const insights = payload.quality_insights?.length ?? 0;
  const confirmed = inference.confirmed_count ?? 0;
  const rejected = inference.rejected_count ?? 0;
  const weak = inference.weak_count ?? 0;
  const totalInf = confirmed + rejected + weak || 1;

  const useful = questions.filter((q) => q.a || q.answer).length + insights;
  const totalInsights = questions.length + insights || 1;

  const useful_insights_ratio = Number((useful / totalInsights).toFixed(3));
  const ignored_insights_ratio = Number((1 - useful_insights_ratio).toFixed(3));
  const confirmed_inference_ratio = Number((confirmed / totalInf).toFixed(3));
  const rejected_inference_ratio = Number((rejected / totalInf).toFixed(3));

  const operational_precision_score = Number(
    ((confirmed_inference_ratio * 0.5 + useful_insights_ratio * 0.5) * (inference.inference_truth_score ?? 0.6)).toFixed(3)
  );

  const cognitive_utility_score = Number(
    Math.min(1, operational_precision_score * 0.6 + useful_insights_ratio * 0.4).toFixed(3)
  );

  return {
    useful_insights_ratio,
    ignored_insights_ratio,
    confirmed_inference_ratio,
    rejected_inference_ratio,
    useless_inference_count: weak,
    suggestions_actioned: 0,
    operational_precision_score,
    cognitive_utility_score,
    auto_execution_blocked: true,
    auto_decisions: false
  };
}

module.exports = { validateCognitiveUtility };
