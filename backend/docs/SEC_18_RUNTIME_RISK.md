# SEC-18 — Runtime Risk

## Métricas calculadas

| Campo | Inputs |
|-------|--------|
| `runtimeRiskScore` | Incidentes, SEC-04 integridade, SEC-14/15/16/17 confiança |
| `exposureScore` | Enumeração, exfiltração, blocking status |
| `operationalRisk` | Readiness SEC-12, incidentes abertos |
| `attackContinuationProbability` | Recorrência, scanners activos |
| `protectionUrgency` | Agregado ponderado |

## Ficheiro

`backend/src/securityRuntimeProtection/engine/runtimeRiskAssessment.js`
