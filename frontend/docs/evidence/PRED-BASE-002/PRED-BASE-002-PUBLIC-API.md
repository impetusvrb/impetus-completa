# PRED-BASE-002 — Public API

**Fonte:** `public-api/platformPredictionPublicApi.js`  
**ID:** `platform.prediction.public_api.v1`

## Operações

| Op | Descrição |
|----|-----------|
| discover | Capacidades + cobertura + limitações |
| query_prediction | Via `dashboard.forecasting.getProjections` + normalizer |
| query_confidence | Bandas / score do payload normalizado |
| query_metadata | health / config / critical factors |
| query_limitations | Inclui exclusão de energia |

## Adapter

`normalizeForecastToPlatformContract(raw, meta)` → shape `platform.prediction.v0`  
`createsNewBackend: false` — reutiliza mounts já em `frontend/src/services/api.js`.

`simulateDecision` / `getSimulation` → lane `simulated_scenario`, nunca `forecast_prediction`.
