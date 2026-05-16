'use strict';

/**
 * Etapa 5 — Cognitive Quality Intelligence (flags; default off).
 */

function envBool(name, defaultValue = false) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === '') return defaultValue;
  const v = String(raw).trim().toLowerCase();
  return v === 'true' || v === '1' || v === 'yes';
}

function isQualityCognitiveRuntimeEnabled() {
  return envBool('IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED', false);
}

function isDriftPredictionEnabled() {
  return isQualityCognitiveRuntimeEnabled() && envBool('IMPETUS_QUALITY_DRIFT_PREDICTION_ENABLED', false);
}

function isRecurrenceAnalysisEnabled() {
  return isQualityCognitiveRuntimeEnabled() && envBool('IMPETUS_QUALITY_RECURRENCE_ANALYSIS_ENABLED', false);
}

function isSupplierScoringEnabled() {
  return isQualityCognitiveRuntimeEnabled() && envBool('IMPETUS_QUALITY_SUPPLIER_SCORING_ENABLED', false);
}

function isAnomalyPredictionEnabled() {
  return isQualityCognitiveRuntimeEnabled() && envBool('IMPETUS_QUALITY_ANOMALY_PREDICTION_ENABLED', false);
}

function isProcessDeteriorationEnabled() {
  return isQualityCognitiveRuntimeEnabled() && envBool('IMPETUS_QUALITY_PROCESS_DETERIORATION_ENABLED', false);
}

function isContextualRecommendationsEnabled() {
  return isQualityCognitiveRuntimeEnabled() && envBool('IMPETUS_QUALITY_CONTEXTUAL_RECOMMENDATIONS_ENABLED', false);
}

function isExecutiveNarrativesEnabled() {
  return isQualityCognitiveRuntimeEnabled() && envBool('IMPETUS_QUALITY_EXECUTIVE_NARRATIVES_ENABLED', false);
}

/** Publicação de eventos industriais assistivos (requer backbone habilitado pelo cliente). */
function isCognitiveIndustrialPublishEnabled() {
  return isQualityCognitiveRuntimeEnabled() && envBool('IMPETUS_QUALITY_COGNITIVE_PUBLISH_EVENTS_ENABLED', false);
}

function getCognitiveRuntimeFlagSnapshot() {
  return {
    cognitive_runtime: isQualityCognitiveRuntimeEnabled(),
    drift_prediction: isDriftPredictionEnabled(),
    recurrence_analysis: isRecurrenceAnalysisEnabled(),
    supplier_scoring: isSupplierScoringEnabled(),
    anomaly_prediction: isAnomalyPredictionEnabled(),
    process_deterioration: isProcessDeteriorationEnabled(),
    contextual_recommendations: isContextualRecommendationsEnabled(),
    executive_narratives: isExecutiveNarrativesEnabled(),
    industrial_publish: isCognitiveIndustrialPublishEnabled()
  };
}

module.exports = {
  isQualityCognitiveRuntimeEnabled,
  isDriftPredictionEnabled,
  isRecurrenceAnalysisEnabled,
  isSupplierScoringEnabled,
  isAnomalyPredictionEnabled,
  isProcessDeteriorationEnabled,
  isContextualRecommendationsEnabled,
  isExecutiveNarrativesEnabled,
  isCognitiveIndustrialPublishEnabled,
  getCognitiveRuntimeFlagSnapshot
};
