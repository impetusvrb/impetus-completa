# SEC-19 — Operational Readiness Score

## Métricas calculadas

| Métrica | Descrição |
|---------|-----------|
| `observabilityCoverage` | Ratio de módulos SEC com audit payload disponível |
| `incidentAccuracy` | Detecção simulada vs cenários totais |
| `falsePositiveRate` | Estimativa conservadora (derivada da cobertura) |
| `falseNegativeRate` | Complemento da accuracy |
| `runtimeStability` | Stress stable + heap dentro de limites |
| `securityLatency` | Latência média simulada (ms) |
| `notificationLatency` | Latência de notificação simulada (ms) |
| `protectionReadiness` | Cobertura de ataque + observabilidade |
| `rollbackReadiness` | Procedimento documentado (flag OFF) |
| `overallOperationalScore` | Score agregado 0–1 |

## Pesos do score agregado

- Observabilidade: 15%
- Incident accuracy: 20%
- False positive/negative: 10% cada
- Runtime stability: 15%
- Protection readiness: 15%
- Rollback readiness: 10%
- Security latency bonus: 5%

## Níveis de readiness

| Score | Nível |
|-------|-------|
| ≥ 0.90 | `ENTERPRISE_READY` |
| ≥ 0.75 | `OPERATIONAL_READY` |
| ≥ 0.60 | `CONDITIONAL` |
| < 0.60 | `NOT_READY` |

## Decisão de certificação

| Condição | Decisão |
|----------|---------|
| Regressão falhou | `REGRESSION_FAILED` |
| Score ≥ 0.75 + observability ≥ 0.70 | `CERTIFIED_OPERATIONAL` |
| Score ≥ 0.60 | `CERTIFIED_WITH_REMARKS` |
| Caso contrário | `NOT_CERTIFIED` |

## Implementação

`backend/src/securityOperationalCertification/engine/operationalReadinessEngine.js`
