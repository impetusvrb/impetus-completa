# AIOI_BUS_ARCHITECTURE

**Fase:** AIOI-GOVERNANCE-01 — Etapa 04  
**Data:** 2026-06-05  
**Modo:** READ-ONLY FORENSE — nenhum código alterado  
**Objetivo:** Definir oficialmente o barramento P0 do AIOI  

---

## 1. Decisão Oficial

> **P0 = PostgreSQL Outbox (`aioi_outbox`)**

O mecanismo soberano do barramento AIOI-P0 é uma tabela PostgreSQL dedicada (`aioi_outbox`) operando no padrão Transactional Outbox, processada por um worker dedicado com `SELECT ... FOR UPDATE SKIP LOCKED`.

---

## 2. Justificativa Técnica

### 2.1 Evidências do Stack Atual

O IMPETUS já opera com PostgreSQL Outbox no Wave 2 (`industrialEventBackbone`):

```
backend/src/eventPipeline/
├── outbox/industrialOutboxService.js     — enqueue + SKIP LOCKED + DLQ
├── backpressure/backpressureController.js — throttling por tenant
├── archive/industrialArchiveService.js   — arquivo frio
├── recovery/streamRecoveryWorker.js      — recovery de stream
└── replay/industrialReplayOrchestrator.js — replay controlado
```

A migration `industrial_event_backbone_wave2_migration.sql` confirma:
- `industrial_event_outbox` com `partition_month`, `status`, `idempotency_key`, `correlation_id`
- `industrial_event_archive` para arquivo frio
- `industrial_event_dlq` com suporte a redrive
- `industrial_event_stream_checkpoint` para recovery

**Evidência:** O padrão outbox PostgreSQL está **production-grade** e **testado** no IMPETUS.

### 2.2 Por que PostgreSQL Outbox é adequado para P0

| Critério | PostgreSQL Outbox | Status |
|---------|-----------------|--------|
| Transacionalidade | INSERT IOE + INSERT outbox na mesma transação | IDEAL |
| Idempotência | `UNIQUE idempotency_key` nativo | IDEAL |
| Multi-tenant | RLS + `company_id` em todo row | IDEAL |
| SKIP LOCKED | Suporte nativo PG 9.5+ | PRONTO |
| Sem dependência nova | Usa pool existente (`backend/src/db/index.js`) | PRONTO |
| Monitoramento | Queries diretas de lag (`pending COUNT`) | PRONTO |
| PM2 compatible | Worker como processo dedicado | COMPATÍVEL |
| Rollback | DELETE / soft-delete; sem mensagem "perdida" | IDEAL |

---

## 3. Compatibilidade

### 3.1 Compatibilidade com `industrialEventBackbone`

| Aspecto | Avaliação |
|---------|-----------|
| Coexistência | **COMPATÍVEL** — `aioi_outbox` é tabela nova; não altera `industrial_event_outbox` |
| Bridge | IOE criado → publica evento W2 `ioe.created` via `publishIndustrialEvent()` |
| `correlation_id` | Compartilhado entre `aioi_outbox` e W2 envelope |
| Contrato | Dois outboxes com domínios distintos; `aioi_outbox` = decisões operacionais; W2 = eventos de sistema |

### 3.2 Compatibilidade com Event Pipeline (W2)

| Aspecto | Avaliação |
|---------|-----------|
| Sem substituição | `industrial_event_outbox` continua operando; AIOI não o depreca |
| Bridge bidirecional | W2 eventos relevantes alimentam adapters IOE; IOE criado publica em W2 |
| `idempotency_key` | Formato distinto; sem colisão |
| DLQ | `aioi_outbox` terá DLQ própria; não compartilha com W2 |

### 3.3 Compatibilidade com Wave2

| Aspecto | Avaliação |
|---------|-----------|
| Arquitetura | AIOI segue exatamente o padrão Wave2 (outbox + worker + DLQ + backpressure) |
| Código base | Reutilizar lógica de `industrialOutboxService.js` como referência para `aioi_outbox` worker |
| Métricas | Mesmo padrão de métricas de lag (pending COUNT por `company_id`) |

### 3.4 Compatibilidade com PM2

| Aspecto | Avaliação |
|---------|-----------|
| Worker dedicado | `impetus-aioi-worker` como processo PM2 separado do HTTP server |
| Restart independente | Falha no worker não afeta HTTP server |
| Estado atual | 348 restarts lifetime confirmados; worker separado mitiga impacto |
| Timeline | Worker PM2 dedicado previsto para P1; P0 pode usar setInterval no server com flag |

---

## 4. Fluxo Completo P0

```
┌─────────────────────────────────────────────────────────────────────┐
│                         AIOI P0 — FLUXO                             │
│                                                                     │
│  Fonte          Adapter           IOE Engine       aioi_outbox      │
│  ──────         ───────           ──────────       ───────────      │
│                                                                     │
│  PLC/F47  ──→  plc_adapter  ──→  computeIOE()  ─┐                 │
│  Comm     ──→  comm_adapter ──→  computeIOE()   │                  │
│  OS/Task  ──→  task_adapter ──→  computeIOE()   │  BEGIN TX        │
│  MES      ──→  mes_adapter  ──→  computeIOE()   ├─→ INSERT ioe     │
│                                                  │   INSERT outbox  │
│                                                  │   COMMIT TX      │
│                                                  └─→              ─┐│
│                                                                   ││
│  ┌────────────────────────────────────────────────────────────────┘│
│  │                                                                  │
│  ▼  Worker (SKIP LOCKED)                                            │
│  aioi_outbox                                                        │
│  ├── Consumer: ClassificationConsumer                               │
│  │   └── classifica category/entity → UPDATE ioe                   │
│  ├── Consumer: PriorityConsumer                                     │
│  │   └── calcula priority_score (chama F47) → UPDATE ioe           │
│  ├── Consumer: QueueConsumer                                        │
│  │   └── INSERT aioi_executive_queue_snapshot                       │
│  └── Consumer: BridgeConsumer                                       │
│      └── publishIndustrialEvent('ioe.created') → W2                │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Queue API                                                    │  │
│  │  GET /api/aioi/queue?company_id=X&limit=20                    │  │
│  │  → aioi_executive_queue_snapshot (snapshot materializado)     │  │
│  │  → CEO Dashboard                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 5. Schema `aioi_outbox` (especificação)

```sql
-- ESPECIFICAÇÃO APENAS — NÃO EXECUTAR

CREATE TABLE aioi_outbox (
  id                UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID      NOT NULL,
  ioe_id            UUID      NOT NULL,  -- FK: industrial_operational_events.id
  consumer_type     TEXT      NOT NULL,  -- 'classification' | 'priority' | 'queue' | 'bridge'
  status            TEXT      NOT NULL DEFAULT 'pending',  -- 'pending' | 'processing' | 'delivered' | 'failed'
  idempotency_key   TEXT      NOT NULL,
  payload           JSONB     NOT NULL DEFAULT '{}'::jsonb,
  attempts          SMALLINT  NOT NULL DEFAULT 0,
  last_error        TEXT      NULL,
  correlation_id    TEXT      NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at      TIMESTAMPTZ NULL,
  UNIQUE (idempotency_key)
);

CREATE INDEX idx_aioi_outbox_pending
  ON aioi_outbox (company_id, status, created_at ASC)
  WHERE status = 'pending';
```

---

## 6. Respostas Obrigatórias

### Kafka é necessário no P0?

**NÃO.**

**Motivos:**
1. Volume P0 (piloto 1–3 tenants, ~50–500 evt/min) é adequado para PostgreSQL Outbox
2. Latência aceitável: snapshot CEO com TTL 60s; worker poll interval 5–10s
3. Kafka adiciona: ZooKeeper/KRaft, tópicos, consumer groups, offsets — infraestrutura nova sem necessidade atual
4. PostgreSQL já disponível, pool configurado, RLS ativo, backups existentes
5. Migração para Kafka/BullMQ é aditiva (P1+) sem alterar contratos IOE

### RabbitMQ é necessário no P0?

**NÃO.**

**Motivos:**
1. Mesmo argumento de volume do Kafka
2. RabbitMQ exigiria novo serviço, autenticação, exchanges/queues — infraestrutura nova
3. PostgreSQL Outbox oferece durabilidade transacional superior ao RabbitMQ para este volume
4. AMQP adiciona complexidade sem benefício mensurável em P0

### Redis é necessário no P0?

**NÃO.**

**Motivos:**
1. Redis seria usado via BullMQ para filas em memória — mais rápido, mas sem garantia transacional
2. P0 exige garantia transacional (INSERT IOE + INSERT outbox atômica) — PostgreSQL é superior
3. Redis Pub/Sub não tem durabilidade por padrão — IOE perdido em restart = risco CRITICAL
4. Cache Redis para snapshot CEO (opcional P1) não é necessário em P0 com TTL 60s no DB

---

## 7. `aioi_outbox` como Mecanismo Soberano do AIOI-P0

> O `aioi_outbox` é o **único mecanismo de transporte de eventos AIOI no P0**.

**Propriedades do mecanismo soberano:**

| Propriedade | Garantia |
|-------------|---------|
| Durabilidade | PostgreSQL ACID — evento nunca perdido após INSERT |
| Idempotência | `UNIQUE idempotency_key` — sem processamento duplo |
| Isolamento tenant | `company_id` + RLS em todo row |
| Ordenação | `created_at ASC` por tenant — FIFO por empresa |
| Backpressure | Consumer lê `LIMIT 50` por ciclo; sem sobrecarga |
| DLQ | `status = 'failed'` + `attempts > 3` → fila de mortos |
| Recovery | Restart do worker reprocessa `status = 'pending'` automaticamente |
| Observabilidade | `SELECT COUNT(*) WHERE status='pending'` = métrica de lag |

---

## 8. Critério de Evolução para P1+

| Condição | Ação |
|---------|------|
| Lag > 2 min por tenant em produção | Avaliar BullMQ (Redis) como worker P1 |
| > 500 evt/min por tenant | Evaliar particionamento ou Kafka |
| Necessidade de fanout multi-serviço | Bridge W2 existente; Kafka P2+ |
| Latência < 1s obrigatória | Redis Pub/Sub cache layer P1 |

---

## 9. Veredito

```
BUS_ARCHITECTURE_APPROVED
```

**Justificativa:**
- PostgreSQL Outbox é o mecanismo mais seguro, simples e production-ready para P0
- Compatível com toda a stack existente (pool DB, RLS, W2 backbone, PM2)
- Kafka, RabbitMQ e Redis são **desnecessários** no P0 — roadmap aditivo para P1+
- `aioi_outbox` como mecanismo soberano elimina risco de perda de evento e garante idempotência transacional

---

*AIOI_BUS_ARCHITECTURE — documento forense, nenhum arquivo operacional alterado.*  
*Gerado em: AIOI-GOVERNANCE-01 / Etapa 04*
