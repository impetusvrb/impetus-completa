# Fase Q — Runtime Cognitive Consistency — Implementação

## Objetivo

Garantir **coerência cognitiva contínua** entre dashboard, KPIs, summaries, insights, chat, módulos, widgets e `runtime_truth_state` — shadow-first, sem enforcement automático global.

---

## Arquitetura

```
Canais (dashboard, kpi, summary, chat)
        │
        ▼
runtimeConsistencyFacade
        │
        ├── cognitiveConsistencyEngine
        │     ├── runtimeTruthSynchronizer
        │     ├── contextualConsistencyResolver
        │     └── interchannelConsistencyCoordinator
        ├── dashboard/chat/kpi/summary ConsistencyValidators
        ├── runtimeTemporalConsistency
        └── consistencyTelemetry
```

---

## Feature flags

| Variável | Default |
|----------|---------|
| `IMPETUS_RUNTIME_CONSISTENCY` | off |
| `IMPETUS_INTERCHANNEL_CONSISTENCY` | off |
| `IMPETUS_TEMPORAL_CONTEXT_STABILIZATION` | off |
| `IMPETUS_RUNTIME_CONSISTENCY_OBSERVABILITY` | **on** |

---

## API interna

`/api/internal/runtime-consistency`:

| GET | Descrição |
|-----|-----------|
| `/status` | Flags |
| `/interchannel` | Alinhamento entre canais |
| `/temporal` | Integridade temporal |
| `/conflicts` | Truth conflicts |
| `/synchronization` | Truth sync state |
| `/report` | Telemetria |

---

## Integração

| Rota | Bloco |
|------|--------|
| `GET /dashboard/me` | `runtime_consistency` |
| `GET /dashboard/kpis` | `runtime_consistency` |
| `GET /dashboard/smart-summary` | `runtime_consistency` |

---

## Métricas

- `cognitive_consistency_score`
- `interchannel_alignment`
- `runtime_truth_integrity`
- `contextual_synchronization`
- `temporal_consistency`
- `pipeline_agreement_score`

---

## Logs

- `COGNITIVE_INCONSISTENCY_DETECTED`
- `INTERCHANNEL_DIVERGENCE_DETECTED`
- `TRUTH_CONFLICT_DETECTED`

---

## Testes

```bash
cd backend
npm run test:runtime-cognitive-consistency
```

Snapshots: executive, coordinator, operator, environmental, quality, safety, financial.

---

## Rollout

1. Produção: observabilidade ON.
2. Monitorizar `runtime_consistency.interchannel.divergence_detected`.
3. Piloto: `INTERCHANNEL_CONSISTENCY=on` por tenant.

---

## Rollback

```bash
export IMPETUS_RUNTIME_CONSISTENCY=off
export IMPETUS_INTERCHANNEL_CONSISTENCY=off
export IMPETUS_TEMPORAL_CONTEXT_STABILIZATION=off
export IMPETUS_RUNTIME_CONSISTENCY_OBSERVABILITY=off
pm2 reload impetus-backend --update-env
```

Fases E→P preservadas.

---

## Stack E→Q

| Fase | Função |
|------|--------|
| E–P | Governança, precisão, convergência, operações, estabilização, targeting |
| **Q** | Consistência intercanal e sincronização de verdade |
