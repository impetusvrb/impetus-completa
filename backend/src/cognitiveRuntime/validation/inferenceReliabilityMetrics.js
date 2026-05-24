'use strict';

function computeInferenceReliabilityMetrics(inferences = []) {
  if (!inferences.length) {
    return {
      precision: 0,
      false_positive_rate: 0,
      historical_confidence: 0,
      valid_causality_ratio: 0,
      by_domain: {},
      by_runtime: {}
    };
  }

  const confirmed = inferences.filter((i) => i.validation_state === 'confirmed' || i.validation_state === 'partially_correct');
  const falsePos = inferences.filter((i) => i.false_positive);
  const precision = confirmed.length / inferences.length;
  const false_positive_rate = falsePos.length / inferences.length;
  const historical_confidence = Number(
    (inferences.reduce((s, i) => s + (i.truth_score ?? 0), 0) / inferences.length).toFixed(3)
  );

  const by_runtime = {};
  for (const i of inferences) {
    const r = i.runtime_source || 'unknown';
    if (!by_runtime[r]) by_runtime[r] = { count: 0, truth_sum: 0 };
    by_runtime[r].count++;
    by_runtime[r].truth_sum += i.truth_score ?? 0;
  }
  for (const r of Object.keys(by_runtime)) {
    by_runtime[r].avg_truth = Number((by_runtime[r].truth_sum / by_runtime[r].count).toFixed(3));
  }

  return {
    precision: Number(precision.toFixed(3)),
    false_positive_rate: Number(false_positive_rate.toFixed(3)),
    historical_confidence,
    valid_causality_ratio: Number((confirmed.length / Math.max(inferences.length, 1)).toFixed(3)),
    by_domain: { quality: by_runtime.runtime_z?.avg_truth ?? null },
    by_runtime
  };
}

function buildInferenceValidationRuntime(validation = {}) {
  const metrics = computeInferenceReliabilityMetrics(validation.inferences || []);
  return {
    ...validation,
    reliability_metrics: metrics,
    auto_decisions: false,
    auto_remediation: false
  };
}

module.exports = { computeInferenceReliabilityMetrics, buildInferenceValidationRuntime };
