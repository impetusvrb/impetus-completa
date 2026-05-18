'use strict';

/**
 * Etapa 4 — Environment Cognitive Intelligence Runtime (default off, shadow).
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function isEnvironmentCognitiveRuntimeEnabled() {
  return envBool('IMPETUS_ENVIRONMENT_COGNITIVE_RUNTIME_ENABLED', false);
}

function isEnvironmentPredictionEnabled() {
  return isEnvironmentCognitiveRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_PREDICTION_ENABLED', false);
}

function isEnvironmentCrossDomainCorrelationEnabled() {
  return isEnvironmentCognitiveRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_CROSS_DOMAIN_CORRELATION_ENABLED', false);
}

function isEnvironmentContextualRecommendationsEnabled() {
  return isEnvironmentCognitiveRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_CONTEXTUAL_RECOMMENDATIONS_ENABLED', false);
}

function isEnvironmentExplainabilityEnabled() {
  return isEnvironmentCognitiveRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_EXPLAINABILITY_ENABLED', true);
}

function isEnvironmentNarrativesEnabled() {
  return isEnvironmentCognitiveRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_NARRATIVES_ENABLED', false);
}

function isEnvironmentCognitivePublishEnabled() {
  return isEnvironmentCognitiveRuntimeEnabled() && envBool('IMPETUS_ENVIRONMENT_COGNITIVE_PUBLISH_EVENTS_ENABLED', false);
}

function getCognitiveRuntimeFlagSnapshot() {
  return {
    cognitive_runtime: isEnvironmentCognitiveRuntimeEnabled(),
    prediction: isEnvironmentPredictionEnabled(),
    cross_domain_correlation: isEnvironmentCrossDomainCorrelationEnabled(),
    contextual_recommendations: isEnvironmentContextualRecommendationsEnabled(),
    explainability: isEnvironmentExplainabilityEnabled(),
    narratives: isEnvironmentNarrativesEnabled(),
    industrial_publish: isEnvironmentCognitivePublishEnabled()
  };
}

module.exports = {
  isEnvironmentCognitiveRuntimeEnabled,
  isEnvironmentPredictionEnabled,
  isEnvironmentCrossDomainCorrelationEnabled,
  isEnvironmentContextualRecommendationsEnabled,
  isEnvironmentExplainabilityEnabled,
  isEnvironmentNarrativesEnabled,
  isEnvironmentCognitivePublishEnabled,
  getCognitiveRuntimeFlagSnapshot
};
