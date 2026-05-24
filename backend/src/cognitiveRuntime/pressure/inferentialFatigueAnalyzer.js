'use strict';

function analyzeInferentialFatigue(payload = {}) {
  const summary = payload.specialized_summary || '';
  const questions = [
    ...(payload.production_contextual_questions || []),
    ...(payload.quality_contextual_questions || [])
  ];
  const inferences = payload.inference_validation_runtime?.inferences || [];
  const weak = payload.inference_validation_runtime?.weak_count ?? 0;

  const texts = [summary, ...questions.map((q) => q.a || q.q || ''), ...inferences.map((i) => i.prediction || '')].filter(Boolean);
  const repetitive_inference_detected = texts.length > 3 && new Set(texts.map((t) => t.slice(0, 40))).size < texts.length * 0.6;

  const narrative_redundancy = summary.length > 100 && questions.length > 4;
  const excessive_runtime_activity =
    (payload.cognitive_convergence_runtime?.new_events_appended ?? 0) > 20 ||
    inferences.length > 15;

  const inferential_fatigue_score = Number(
    Math.min(
      1,
      (repetitive_inference_detected ? 0.35 : 0) +
        (narrative_redundancy ? 0.25 : 0) +
        (excessive_runtime_activity ? 0.2 : 0) +
        weak * 0.03
    ).toFixed(3)
  );

  const fatigue_safe = inferential_fatigue_score < 0.45;

  return {
    inferential_fatigue_score,
    repetitive_inference_detected,
    narrative_redundancy,
    excessive_runtime_activity,
    fatigue_safe,
    auto_decisions: false
  };
}

module.exports = { analyzeInferentialFatigue };
