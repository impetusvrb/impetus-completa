# CERT-EVENT-RETENTION-01 — Política de Retenção, Arquivamento e Ciclo de Vida do Event Backbone

**Data:** 2026-06-30  
**Tipo:** Evolução Arquitetural  
**Prioridade:** Alta (Infraestrutura Cognitiva)  
**Status:** CERTIFICADO — implementação aditiva concluída

---

## Declaração

Foi implementada uma política completa de **Lifecycle Management** para o Backbone de Eventos do IMPETUS. O objetivo **não é apagar eventos**, mas definir o **ciclo de vida completo** com rastreabilidade, auditoria, explainability, LGPD e compatibilidade total com módulos consumidores.

**Princípios respeitados:**

- ✅ Desenvolvimento 100% aditivo
- ✅ Nenhuma alteração estrutural em módulos consumidores
- ✅ Nenhuma API existente quebrada
- ✅ Nenhum evento perdido por expurgo automático
- ✅ Auditoria completa por transição
- ✅ Explainability preservada
- ✅ Human-in-the-Loop preservado
- ✅ LGPD preservada
- ✅ Observabilidade integrada
- ✅ Scheduler resiliente (shadow por defeito)

---

## FASE 1 — Auditoria do Backbone

| Tabela | Registos | Tamanho (snapshot 2026-06-30) |
|--------|----------|--------------------------------|
| `industrial_event_outbox` | ~9.288.041 | ~25 GB |
| `industrial_event_archive` | ~122.779 | ~290 MB |
| `industrial_operational_events` | ~13.172 | ~14 MB |
| `event_backbone_retention_policy` | 6 | 32 kB |
| `event_backbone_lifecycle_audit` | 0* | 40 kB |

\* Auditoria populada após primeira execução em modo `active`.

**Produtores:** event ingestion industrial, módulos operacionais (TPM, MES, telemetria), cognitivos (Pulse, ANAM, Controller).

**Consumidores:** Pulse Cognitivo, Gêmeo Digital, ANAM, Dashboard, Controller Cognitivo, Mapping Industrial, ERP/MES — **nenhum alterado**.

---

## FASE 2 — Classificação

Implementado em `eventBackboneCategoryRegistry.js`:

- Operacionais: `operational_telemetry`, `operational_industrial`
- Humanos: `human_pulse`
- Cognitivos: `cognitive`
- Auditoria: `audit_compliance`
- Workflow: `workflow_outbox`

---

## FASE 3 — Estados

`eventLifecycleStates.js`:

`ACTIVE` → `CONSOLIDATED` → `ARCHIVED` → `HISTORICAL` → `PURGE_ELIGIBLE` → `PURGED`

Grafo de transições validado; nunca inferido manualmente em consumidores.

---

## FASE 4 — Políticas configuráveis

Tabela `event_backbone_retention_policy` com 6 seeds (telemetria, industrial, pulse, cognitivo, auditoria, outbox).

Documentação detalhada: [`EVENT_BACKBONE_RETENTION_POLICY.md`](./EVENT_BACKBONE_RETENTION_POLICY.md)

---

## FASE 5–7 — Arquivamento, compressão, índices

- **Arquivo:** `eventArchiveService.js` — camada sobre `industrialArchiveService.js`
- **Compressão:** gzip em `compressed_payload` + `integrity_checksum` SHA-256
- **Índices históricos:** migration `event_backbone_retention_lifecycle_migration.sql`

---

## FASE 8 — Event Archive Service

`backend/src/eventPipeline/retention/eventArchiveService.js`

- `archiveWithLifecycle`, `queryArchivedEvents`, `restoreArchiveMetadata`
- `validateIntegrity`, `compressArchivedBatch`, `getArchiveStatistics`

---

## FASE 9 — Retention Engine

`backend/src/eventPipeline/retention/eventRetentionEngine.js`

- `runRetentionCycle`, `evaluateArchivedEligibility`, `transitionArchiveState`
- `recordLifecycleAudit`, `enrichOutboxCategory`
- **Nunca remove diretamente** — apenas transições de estado

---

## FASE 10 — Scheduler

`backend/src/eventPipeline/retention/eventRetentionScheduler.js`

- Intervalo diário (configurável)
- Shadow por defeito (`IMPETUS_EVENT_RETENTION_SCHEDULER=shadow`)
- Boot em `server.js` (delay 9s)
- Não bloqueia produção (`unref` + boot delay)

---

## FASE 11 — Auditoria

Tabela `event_backbone_lifecycle_audit`:

- `trace_id`, `timestamp`, `reason`, `policy_id`, `actor_type`, `scheduler_run_id`, `metadata`

---

## FASE 12 — Observabilidade

Métricas adicionadas a `observabilityService.js`:

`event_active`, `event_archived`, `event_retention_processed`, `event_retention_failed`, `event_archive_size`, `event_retention_duration`, `event_purge_candidates`, `event_restore_requests`

---

## FASE 13 — Explainability

`eventRetentionExplainability.js` + rota `GET /retention/archive/:id/explain`

Retorna: origem, timeline, estado, política, integridade, audit trail.

---

## FASE 14 — LGPD

Políticas com `lgpd_anonymize_before_archive` para `human_pulse`. Categoria `audit_compliance` com `purge_allowed=false` e preservação permanente.

---

## FASE 15 — Expurgo

- Nunca automático
- Requer `IMPETUS_EVENT_RETENTION_ALLOW_PURGE=true`
- Somente estado `PURGE_ELIGIBLE` → `PURGED` (fluxo governado futuro)

---

## FASE 16 — Compatibilidade

**Evidência:** zero alterações em módulos consumidores. Apenas adições em:

- `backend/src/eventPipeline/retention/*` (novo)
- `backend/src/routes/internal/industrialEventBackbone.js` (rotas aditivas)
- `backend/src/services/observabilityService.js` (métricas)
- `backend/src/server.js` (boot scheduler)
- `backend/migrations/event_backbone_retention_lifecycle_migration.sql`

---

## FASE 17 — Documentação

- [`EVENT_BACKBONE_RETENTION_POLICY.md`](./EVENT_BACKBONE_RETENTION_POLICY.md)
- Este certificado

---

## FASE 18 — Testes

```bash
cd backend && node src/tests/test-event-retention.js
```

**Resultado:** 26 passou, 0 falhou (2026-06-30)

---

## FASE 19 — Entregáveis

### 1. Arquitetura implementada

Camada aditiva `eventPipeline/retention/` sobre backbone WAVE 2 existente, sem alterar ingestion nem contratos.

### 2. Políticas por categoria

6 políticas seed — ver `EVENT_BACKBONE_RETENTION_POLICY.md`.

### 3. Serviços criados

| Ficheiro | Função |
|----------|--------|
| `eventArchiveService.js` | Arquivo + integridade |
| `eventRetentionEngine.js` | Motor de políticas |
| `eventRetentionScheduler.js` | Scheduler diário |
| `eventRetentionExplainability.js` | Explainability |
| `eventLifecycleStates.js` | Estados |
| `eventBackboneCategoryRegistry.js` | Classificação |

### 4. Estados do ciclo de vida

6 estados canónicos com grafo de transições.

### 5. Migration SQL

`migrations/event_backbone_retention_lifecycle_migration.sql`

### 6. Scheduler

`eventRetentionScheduler.js` + boot `server.js`

### 7. Métricas

8 métricas novas em `observabilityService.js`

### 8. Testes executados

`test-event-retention.js` — 26/26 ✅

### 9. Compatibilidade cognitiva

Consumidores intactos; consultas operacionais inalteradas.

### 10. Evidência de não-alteração de consumidores

Diff limitado a `retention/`, rotas internas aditivas, observability e server boot.

---

## Variáveis de ambiente

| Variável | Defeito |
|----------|---------|
| `IMPETUS_EVENT_RETENTION_SCHEDULER` | `shadow` |
| `IMPETUS_EVENT_RETENTION_ENGINE` | `shadow` |
| `IMPETUS_EVENT_RETENTION_MODE` | `shadow` |
| `IMPETUS_EVENT_RETENTION_ALLOW_PURGE` | `false` |

Para ativar transições reais: `IMPETUS_EVENT_RETENTION_MODE=active` (após validação operacional).

---

## Observação final

Esta implementação estabelece **infraestrutura central e estável** para o crescimento sustentável do ecossistema IMPETUS (Pulse, Gêmeo Digital, ANAM, ERP/MES, ESG, Energia e futuros módulos), preservando rastreabilidade e conformidade — **não apenas liberando espaço em disco**.
