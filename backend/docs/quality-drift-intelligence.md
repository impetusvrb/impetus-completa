# Drift intelligence (Quality cognitive)

## Motor

`qualityDriftPredictionEngine.js` — EWMA, variância em janelas deslizantes, declive sobre EWMA; severidade e confiança calibráveis por `opts`.

## Evento

`quality.cognitive.drift_predicted` — emitido só com `IMPETUS_QUALITY_COGNITIVE_PUBLISH_EVENTS_ENABLED=true` e `emit_events` não bloqueado.

## Explicabilidade

Cada output inclui `explainability` (rationale, evidence, cálculo, fatores contribuintes).
