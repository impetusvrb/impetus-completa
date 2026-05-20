# Fase Y — Runtime Operational Calibration — Implementação

## Objetivo

Primeira fase **pós-fundação**: calibrar runtime por tenant, consolidar gaps reais e recomendar tuning — **sem auto_apply**.

---

## Arquitetura

```
GET /dashboard/me
        │
        ▼
runtimeCalibrationFacade.enrichWithRuntimeCalibration
        ├── tenantRuntimeCalibrationEngine
        ├── operationalUsefulnessCalibration
        ├── runtimeGapConsolidator
        ├── runtimeOperationalMaturityEngine
        ├── tenantStabilizationSupervisor
        ├── controlledRuntimeTuningAdvisor
        └── pipelineConsolidationAdvisor
```

Consolida sinais das fases E→X presentes no contexto `/dashboard/me`.

---

## Feature flags

| Variável | Default |
|----------|---------|
| `IMPETUS_RUNTIME_CALIBRATION` | **off** |
| `IMPETUS_TENANT_STABILIZATION` | **off** |
| `IMPETUS_RUNTIME_TUNING_ADVISOR` | **off** |
| `IMPETUS_PIPELINE_CONSOLIDATION_ANALYSIS` | **off** |
| `IMPETUS_RUNTIME_CALIBRATION_OBSERVABILITY` | **on** |

---

## API

`/api/internal/runtime-calibration`

| GET | Rota |
|-----|------|
| | `/status`, `/tenants`, `/maturity`, `/gaps`, `/stability`, `/tuning`, `/pipelines`, `/report` |

---

## Blocos `GET /dashboard/me`

- `runtime_calibration`
- `tenant_stabilization`
- `operational_maturity`
- `runtime_tuning`
- `rollout_stability`

---

## Testes

```bash
npm run test:runtime-operational-calibration
```

---

## Operação supervisionada

1. Observabilidade Y ON  
2. `/report` por tenant piloto  
3. Revisar `runtime_tuning.tuning_recommendations`  
4. Actuar manualmente (flags, canais S, dados reais)  
5. Nunca `auto_apply` em produção sem aprovação  
