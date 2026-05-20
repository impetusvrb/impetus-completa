# Fase N — Enterprise Cognitive Operations — Implementação

## Objetivo

Operar o runtime cognitivo convergente (E→M) com **autossupervisão**, **saúde contínua**, **confiança dinâmica** e **calibração recomendada** — sem auto-correcção nem enforcement automático.

---

## Arquitetura operacional

```
Dashboard / canais
        │
        ▼ (após semantic_alignment, precision_delivery, cognitive_convergence)
cognitiveOperationsFacade
        │
        ├── enterpriseCognitiveOperationsEngine
        │     ├── runtimeCognitiveSupervisor
        │     └── governanceOperationalCoordinator → cognitiveOperationalState
        ├── cognitiveHealthMonitor + runtimeStabilityMonitor
        ├── convergenceHealthMonitor + contextualIntegrityMonitor
        ├── cognitiveEntropyDetector + governanceDegradationDetector
        ├── dynamicConfidenceEngine + operationalConfidenceResolver
        ├── cognitiveStabilityEngine + semanticStabilityResolver
        ├── selfObservingGovernance (self-evaluation + reflection)
        ├── runtimeAnomalyCorrelation
        ├── governanceCalibrationEngine (recommend only)
        └── enterpriseOperationalTelemetry
```

---

## Feature flags

| Variável | Default |
|----------|---------|
| `IMPETUS_ENTERPRISE_COGNITIVE_OPERATIONS` | off |
| `IMPETUS_RUNTIME_ENTROPY_DETECTION` | off |
| `IMPETUS_DYNAMIC_CONFIDENCE_ENGINE` | off |
| `IMPETUS_COGNITIVE_STABILITY_ENGINE` | off |
| `IMPETUS_GOVERNANCE_CALIBRATION` | off |
| `IMPETUS_ENTERPRISE_OPERATIONS_OBSERVABILITY` | **on** |

---

## API interna

`/api/internal/cognitive-operations` (auth + ACL governance):

| GET | Descrição |
|-----|-----------|
| `/status` | Estado operacional + flags |
| `/health` | Saúde cognitiva runtime |
| `/entropy` | Entropia + tendência |
| `/stability` | Estabilidade |
| `/confidence` | Confiança dinâmica |
| `/anomalies` | Correlação de anomalias |
| `/calibration` | Recomendações (sem auto-exec) |
| `/report` | Relatório completo + telemetria |

---

## Integração dashboard

`GET /dashboard/me` inclui bloco opcional:

```json
"enterprise_cognitive_operations": {
  "phase": "N",
  "health": { "cognitive_runtime_health": 0.87, "status": "healthy" },
  "entropy": { "runtime_entropy_score": 0.12 },
  "confidence": { "operational_confidence": 0.85 },
  "calibration": { "recommendations": [], "auto_execute": false },
  "auto_correct": false,
  "auto_calibrate": false
}
```

Payload legacy **inalterado** em shadow.

---

## Métricas enterprise

- `governance_operational_maturity`
- `runtime_entropy_score`
- `convergence_operational_health`
- `contextual_stability_rate`
- `runtime_resilience`
- `cognitive_operational_pressure`
- `governance_effectiveness_score`
- `operational_trustworthiness`

---

## Logs

- `COGNITIVE_ENTROPY_DETECTED`
- `RUNTIME_DEGRADATION_DETECTED`
- `GOVERNANCE_DEGRADATION_DETECTED`
- `RUNTIME_SUPERVISION_TICK`

---

## Testes

```bash
cd backend
npm run test:enterprise-cognitive-operations
```

Snapshots: `tests/enterprise-cognitive-operations/snapshots/` (9 cenários incl. degraded, high-drift, fallback-heavy).

---

## Rollout

1. Produção: só observabilidade ON.
2. Monitorizar `enterprise_cognitive_operations.health.status` e `entropy`.
3. Usar `/calibration` para tuning manual.
4. Piloto: activar `DYNAMIC_CONFIDENCE_ENGINE` se métricas estáveis.

---

## Rollback

```bash
export IMPETUS_ENTERPRISE_COGNITIVE_OPERATIONS=off
export IMPETUS_RUNTIME_ENTROPY_DETECTION=off
export IMPETUS_DYNAMIC_CONFIDENCE_ENGINE=off
export IMPETUS_COGNITIVE_STABILITY_ENGINE=off
export IMPETUS_GOVERNANCE_CALIBRATION=off
export IMPETUS_ENTERPRISE_OPERATIONS_OBSERVABILITY=off
pm2 reload impetus-backend --update-env
```

Sem rollback automático. Fases E→M permanecem activas.

---

## Relação com fases anteriores

| Fase | Contribui para N |
|------|------------------|
| K | semantic_alignment → sinais de saúde |
| L | precision_delivery → fallback/overdelivery |
| M | cognitive_convergence → truth + drift |
| **N** | supervisão operacional contínua |

N **não substitui** M; consome os blocos `cognitive_convergence`, `precision_delivery`, `semantic_alignment`.
