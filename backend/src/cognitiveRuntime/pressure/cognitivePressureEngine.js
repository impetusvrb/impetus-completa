'use strict';

function measureCognitivePressure(payload = {}) {
  const questions =
    (payload.quality_contextual_questions?.length ?? 0) +
    (payload.production_contextual_questions?.length ?? 0) +
    (payload.maintenance_contextual_questions?.length ?? 0);
  const insights = payload.quality_insights?.length ?? 0;
  const alerts = payload.production_bottleneck_runtime?.propagation_risk === 'high' ? 3 : 1;
  const inferences = payload.inference_validation_runtime?.inferences?.length ?? 0;
  const exec = payload.executive_cognitive_runtime?.consolidation_applied ? 1 : 0;
  const runtimes =
    [
      payload.production_cognitive_runtime,
      payload.quality_authority_runtime,
      payload.maintenance_cognitive_runtime,
      payload.executive_cognitive_runtime
    ].filter((r) => r?.consolidation_applied || r?.authority_mode).length;

  const inferential_pressure = Number(Math.min(1, (questions + inferences) / 15).toFixed(3));
  const alert_pressure = Number(Math.min(1, alerts / 5).toFixed(3));
  const runtime_noise_level = Number(Math.min(1, runtimes / 6 + (payload.cognitive_authority_runtime?.fragmentation_detected ? 0.2 : 0)).toFixed(3));
  const executive_overload_risk = Number(
    Math.min(1, exec * 0.3 + (payload.executive_alignment_runtime?.narrative_dependency_ratio ?? 0) * 0.5 + insights * 0.05).toFixed(3)
  );

  const cognitive_pressure_index = Number(
    ((inferential_pressure + alert_pressure + runtime_noise_level + executive_overload_risk) / 4).toFixed(3)
  );

  const pressure_safe = cognitive_pressure_index < 0.65 && executive_overload_risk < 0.7;

  return {
    cognitive_pressure_index,
    inferential_pressure,
    runtime_noise_level,
    executive_overload_risk,
    alert_pressure,
    pressure_safe,
    insight_count: questions + insights,
    auto_mutation: false
  };
}

module.exports = { measureCognitivePressure };
