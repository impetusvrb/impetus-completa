/**
 * Flags Vite — Quality Cognitive Runtime (Etapa 5). Default false.
 */
function envTrue(v) {
  return v === 'true' || v === '1' || v === 'yes';
}

export function isQualityCognitiveRuntimeEnabled() {
  return envTrue(import.meta.env.VITE_IMPETUS_QUALITY_COGNITIVE_RUNTIME_ENABLED);
}

export function isDriftPredictionEnabled() {
  return isQualityCognitiveRuntimeEnabled() && envTrue(import.meta.env.VITE_IMPETUS_QUALITY_DRIFT_PREDICTION_ENABLED);
}

export function isRecurrenceAnalysisEnabled() {
  return isQualityCognitiveRuntimeEnabled() && envTrue(import.meta.env.VITE_IMPETUS_QUALITY_RECURRENCE_ANALYSIS_ENABLED);
}

export function isSupplierScoringEnabled() {
  return isQualityCognitiveRuntimeEnabled() && envTrue(import.meta.env.VITE_IMPETUS_QUALITY_SUPPLIER_SCORING_ENABLED);
}

export function isAnomalyPredictionEnabled() {
  return isQualityCognitiveRuntimeEnabled() && envTrue(import.meta.env.VITE_IMPETUS_QUALITY_ANOMALY_PREDICTION_ENABLED);
}

export function isProcessDeteriorationEnabled() {
  return isQualityCognitiveRuntimeEnabled() && envTrue(import.meta.env.VITE_IMPETUS_QUALITY_PROCESS_DETERIORATION_ENABLED);
}

export function isContextualRecommendationsEnabled() {
  return isQualityCognitiveRuntimeEnabled() && envTrue(import.meta.env.VITE_IMPETUS_QUALITY_CONTEXTUAL_RECOMMENDATIONS_ENABLED);
}

export function isExecutiveNarrativesEnabled() {
  return isQualityCognitiveRuntimeEnabled() && envTrue(import.meta.env.VITE_IMPETUS_QUALITY_EXECUTIVE_NARRATIVES_ENABLED);
}

export function getQualityCognitiveFlagSnapshot() {
  return {
    cognitive_runtime: isQualityCognitiveRuntimeEnabled(),
    drift: isDriftPredictionEnabled(),
    recurrence: isRecurrenceAnalysisEnabled(),
    supplier: isSupplierScoringEnabled(),
    anomaly: isAnomalyPredictionEnabled(),
    deterioration: isProcessDeteriorationEnabled(),
    recommendations: isContextualRecommendationsEnabled(),
    narratives: isExecutiveNarrativesEnabled()
  };
}
