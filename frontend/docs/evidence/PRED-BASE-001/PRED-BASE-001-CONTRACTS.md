# PRED-BASE-001 — Contracts

**Fonte:** `contracts/enterprisePredictionContracts.js`

## `platform.prediction.v0`

Contrato corporativo (spec only · `implementsModel: false`):

- **Input:** domain_id, target_indicator, horizon, history_refs, company_id, as_of  
- **Output:** prediction_id, point_estimate, confidence (+ bandas), semantic_lane=`forecast_prediction`, evidence_refs, limitations, trace_id  
- **Regra:** domínios consomem este contrato — proibido motor paralelo equivalente

Também: `platform.prediction_confidence.v0` (alinhado a FIN-PRED) e mount operacional `dashboard.forecasting.*` marcado **uncertified_as_enterprise_prediction** até GAP-PB-005.
