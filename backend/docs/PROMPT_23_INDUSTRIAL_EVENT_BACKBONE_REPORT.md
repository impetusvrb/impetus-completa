# PROMPT 23 — Industrial Event Backbone (relatório de entrega)

**Data:** 2026-05-27  
**Tipo:** implementação aditiva WAVE 2 sobre WAVE 1  
**Princípios:** additive-only, shadow-first, rollback por flags, audit trail, tenant isolation

---

## 1. Sumário

Completado o backbone industrial de eventos com replay governado, particionamento lógico, archive, DLQ redrive, backpressure, stream recovery e governança de retenção — **sem alterar** Motor A, Engine V2, `envelope.js` v2, `auditOutboxService` nem `cognitiveEventBackboneService`.

## 2. Capacidades entregues

| Capacidade | Módulo | Flag principal |
|------------|--------|----------------|
| Replay shadow/audit/on | `replay/industrialReplayOrchestrator.js` | `IMPETUS_INDUSTRIAL_REPLAY_MODE` |
| Particionamento tenant+mês | `partition/partitionKeyService.js` | `IMPETUS_INDUSTRIAL_PARTITIONING_ENABLED` |
| TTL / archive | `archive/industrialArchiveService.js` + registry | `IMPETUS_INDUSTRIAL_ARCHIVE_ENABLED` |
| DLQ + redrive | `dlq/industrialDlqService.js` | `IMPETUS_INDUSTRIAL_DLQ_ENABLED` |
| Backpressure | `backpressure/backpressureController.js` | `IMPETUS_INDUSTRIAL_BACKPRESSURE_MODE` |
| Stream recovery | `recovery/streamRecoveryWorker.js` | `IMPETUS_INDUSTRIAL_STREAM_RECOVERY_ENABLED` |
| Scheduler | `scheduler/industrialBackboneScheduler.js` | `IMPETUS_INDUSTRIAL_BACKBONE_SCHEDULER` |
| Retention governance | `governance/industrialRetentionGovernance.js` | — |

## 3. Migração

`backend/migrations/industrial_event_backbone_wave2_migration.sql`

- `partition_month` em `industrial_event_outbox`
- `industrial_event_archive`
- `industrial_event_backpressure_audit`
- `industrial_event_stream_checkpoint`
- colunas `redriven_at` / `redrive_count` em DLQ

## 4. Rotas internas (inalteradas em path base)

| Método | Rota | Função |
|--------|------|--------|
| GET | `/api/internal/industrial-event-backbone/health` | Health W1+W2 |
| GET | `/api/internal/industrial-event-backbone/governance` | Snapshot retenção |
| POST | `/api/internal/industrial-event-backbone/replay` | Replay governado |
| POST | `/api/internal/industrial-event-backbone/recovery/run` | Stream recovery |
| POST | `/api/internal/industrial-event-backbone/archive/run` | Archive batch |
| POST | `/api/internal/industrial-event-backbone/dlq/redrive` | DLQ → outbox |

## 5. Rollout recomendado

1. Aplicar migração SQL.
2. Manter WAVE 1 flags actuais.
3. `IMPETUS_INDUSTRIAL_BACKBONE_MODE=shadow` → observar logs `[INDUSTRIAL_*]`.
4. `audit` → replay/archive/recovery sem enforce de backpressure.
5. `on` + `IMPETUS_INDUSTRIAL_BACKBONE_SCHEDULER=true` após validação multi-tenant.

### 5.1 Estado lab (2026-05-27) — audit-on piloto

| Flag | Valor |
|------|-------|
| `IMPETUS_INDUSTRIAL_BACKBONE_MODE` | `on` |
| `IMPETUS_INDUSTRIAL_BACKBONE_SCHEDULER` | `true` |
| `IMPETUS_INDUSTRIAL_ARCHIVE_ENABLED` | `true` |
| `IMPETUS_INDUSTRIAL_ARCHIVE_MODE` | `on` (archive real) |
| `IMPETUS_INDUSTRIAL_BACKPRESSURE_MODE` | `enforce` |
| `IMPETUS_INDUSTRIAL_BACKPRESSURE_PILOT_ONLY` | `true` |
| `IMPETUS_INDUSTRIAL_BACKBONE_PILOT_TENANTS` | `21dd3cee-2efa-4936-908f-9ff1ba04e2a3` |
| `IMPETUS_INDUSTRIAL_REPLAY_MODE` | `audit` |

**Load test piloto (200 evt, conc. 20):** pass — throughput ~318 evt/s, p95 155 ms, 0 throttled, 0 DLQ.

Archive real promovido em 2026-05-27 (`IMPETUS_INDUSTRIAL_ARCHIVE_MODE=on`). Scheduler move `delivered` &gt; 7 dias para `industrial_event_archive`.

## 6. Rollback

```env
IMPETUS_INDUSTRIAL_BACKBONE_MODE=off
IMPETUS_INDUSTRIAL_BACKBONE_SCHEDULER=false
```

WAVE 1 continua operacional com as suas flags independentes.

## 7. Validação

```bash
cd backend && node src/tests/wave2IndustrialEventBackboneScenarios.js
node src/tests/wave1IndustrialEventBackboneScenarios.js
```

## 8. Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| I/O archive em volume alto | batch LIMIT 200; scheduler 1h |
| Replay on cross-tenant | `company_id` obrigatório em replay on |
| Backpressure bloqueia ingest | default `observe` |
| Schema sem W2 | INSERT fallback sem `partition_month` |
