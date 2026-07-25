# FIN-PRED-READY-001 — Confidence & explainability

**Fonte:** `confidence/predictionConfidenceContract.js`

## Cadeia

```
Prediction → Confidence → Evidence → Explanation
```

## Contrato

`finance.prediction_confidence.v0` — **spec only** (`computesConfidence: false`, `algorithm: null`)

Campos obrigatórios incluem: `point_estimate`, `confidence_score`, bandas low/high, `semantic_lane=forecast_prediction`, `evidence_refs`, `explanation`, `limitations`.

**Proibido:** apresentar estimativa pontual sem incerteza.

## Explainability mínima

origem · hipótese · histórico utilizado · confiança · limitações · evidências

Sem estes campos, nenhuma previsão futura é válida.
