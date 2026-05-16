# Predictive runtime (Quality cognitive)

## Motores

- **Pré-anomalia:** `qualityPredictiveAnomalyEngine.js` — proximidade a USL/LSL, declive, cruzamento com drift/recorrência.
- **Degradação:** `qualityProcessDeteriorationEngine.js` — rácio de variância entre metades; declive de taxas de defeito.
- **Risco agregado:** `qualityPredictiveRiskScore.js` — mistura linear pesada e transparente.

## Orquestração

`qualityCognitiveOrchestrator.js` — throttling por tenant, consulta opcional a `aiContextBudgetService.resolveBudget`, métricas `enterpriseObservabilityRuntime.recordMetric`, publicação industrial opcional.

## Métricas (nomes estáveis)

`quality_cognitive_runtime_ms`, `quality_drift_prediction_ms`, `quality_recurrence_analysis_ms`, `quality_supplier_scoring_ms`, `quality_process_deterioration_ms`, `quality_anomaly_prediction_ms`, `quality_recommendation_runtime_ms`.
