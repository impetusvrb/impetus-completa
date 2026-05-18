/**
 * Flags Vite — Environment Cognitive Intelligence Runtime (Etapa 4). Default false.
 */
function envTrue(v) {
  return v === 'true' || v === '1' || v === 'yes';
}

export function isEnvironmentCognitiveRuntimeEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_ENVIRONMENT_COGNITIVE_RUNTIME_ENABLED);
}

export function getEnvironmentCognitiveFlagSnapshot() {
  return {
    cognitive_runtime: isEnvironmentCognitiveRuntimeEnabled(),
    prediction: envTrue(import.meta.env.VITE_IMPETUS_ENVIRONMENT_PREDICTION_ENABLED),
    recommendations: envTrue(import.meta.env.VITE_IMPETUS_ENVIRONMENT_CONTEXTUAL_RECOMMENDATIONS_ENABLED),
    narratives: envTrue(import.meta.env.VITE_IMPETUS_ENVIRONMENT_NARRATIVES_ENABLED)
  };
}
