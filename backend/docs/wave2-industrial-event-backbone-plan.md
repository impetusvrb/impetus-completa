# WAVE 2 / PROMPT 23 — Industrial Event Backbone (completo)

> Entrega **aditiva** sobre WAVE 1. Não altera `envelope.js` v2, `auditOutboxService`, `cognitiveEventBackboneService`, Motor A nem Engine V2.

## 1. Objetivo

Completar o backbone industrial com: replay governado, particionamento lógico, TTL/archive, DLQ redrive, backpressure, stream recovery, retenção alinhada ao registry LGPD.

## 2. Componentes novos

| Módulo | Caminho | Função |
|--------|---------|--------|
| Flags W2 | `eventPipeline/industrialFlags.js` | `IMPETUS_INDUSTRIAL_BACKBONE_MODE`, archive, recovery, replay mode |
| Partição | `eventPipeline/partition/partitionKeyService.js` | `company_id:YYYY-MM` |
| Backpressure | `eventPipeline/backpressure/backpressureController.js` | profundidade de fila + taxa |
| Recovery | `eventPipeline/recovery/streamRecoveryWorker.js` | pending stale após crash |
| Archive | `eventPipeline/archive/industrialArchiveService.js` | delivered → archive |
| Replay | `eventPipeline/replay/industrialReplayOrchestrator.js` | shadow / audit / on |
| Governança | `eventPipeline/governance/industrialRetentionGovernance.js` | TTL + archive antes de purge |
| Scheduler | `eventPipeline/scheduler/industrialBackboneScheduler.js` | drain, archive, recovery, replay |
| DLQ redrive | `eventPipeline/dlq/industrialDlqService.js` | re-enfileirar DLQ → outbox |

## 3. Flags (defaults seguros)

| Flag | Default | Notas |
|------|---------|-------|
| `IMPETUS_INDUSTRIAL_BACKBONE_MODE` | `shadow` | off \| shadow \| audit \| on |
| `IMPETUS_INDUSTRIAL_PARTITIONING_ENABLED` | `false` | partition_month + partition_key composto |
| `IMPETUS_INDUSTRIAL_ARCHIVE_ENABLED` | `false` | archive antes de purge retention |
| `IMPETUS_INDUSTRIAL_STREAM_RECOVERY_ENABLED` | `true` | recovery no boot + scheduler |
| `IMPETUS_INDUSTRIAL_REPLAY_MODE` | `shadow` | shadow \| audit \| on (fallback `REPLAY_SHADOW`) |
| `IMPETUS_INDUSTRIAL_BACKPRESSURE_MODE` | `observe` | observe \| enforce |
| `IMPETUS_INDUSTRIAL_BACKBONE_SCHEDULER` | `false` | jobs periódicos |

Flags WAVE 1 inalteradas (`IMPETUS_INDUSTRIAL_EVENTS_ENABLED`, etc.).

## 4. Rollback

1. `IMPETUS_INDUSTRIAL_BACKBONE_SCHEDULER=false`
2. `IMPETUS_INDUSTRIAL_BACKBONE_MODE=off`
3. WAVE 1 continua com flags próprias; tabelas W2 ficam inertes.

## 5. Rotas internas (RBAC internal net)

- `GET /api/internal/industrial-event-backbone/health` — health W1+W2
- `POST /api/internal/industrial-event-backbone/replay` — replay governado
- `POST /api/internal/industrial-event-backbone/recovery/run`
- `POST /api/internal/industrial-event-backbone/archive/run`
- `POST /api/internal/industrial-event-backbone/dlq/redrive`
- `GET /api/internal/industrial-event-backbone/governance`

## 6. Impacto / riscos

| Área | Impacto | Risco | Mitigação |
|------|---------|-------|-----------|
| Hot path publish | Baixo | throttle extra | observe por defeito |
| PostgreSQL | Médio | I/O archive | batch + LIMIT |
| Retention worker | Baixo | purge sem archive | archive flag + governance |
| Multi-tenant | Médio | cross-tenant replay | `company_id` obrigatório em replay on |

## 7. Validação

```bash
node src/tests/wave2IndustrialEventBackboneScenarios.js
```
