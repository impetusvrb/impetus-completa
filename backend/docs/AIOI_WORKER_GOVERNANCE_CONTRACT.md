# AIOI — Worker Governance Contract

**Camada:** P2.1 — Production Worker Governance  
**Serviço:** `backend/src/services/aioi/aioiOutboxWorkerService.js`  
**Base:** `aioiOutboxConsumerService` + `aioiClassificationConsumerService`  

---

## 1. Responsabilidade

Worker operacional definitivo do `aioi_outbox` — processamento controlado de classificação (`consumer_type='classification'`) para tenants piloto.

---

## 2. Critérios WG-01..WG-10

| ID | Critério | Implementação |
|----|----------|---------------|
| WG-01 | `setInterval` controlado | `startWorker()` + `IMPETUS_AIOI_OUTBOX_WORKER_INTERVAL_MS` |
| WG-02 | Single instance lock | `pg_try_advisory_lock(8820202606)` |
| WG-03 | Safe shutdown | `stopWorker()` + handlers SIGTERM/SIGINT |
| WG-04 | Graceful restart | `restartWorker()` |
| WG-05 | Batch configurável | `IMPETUS_AIOI_OUTBOX_BATCH_SIZE` |
| WG-06 | Retry governance preservada | Delegação a `markFailedOrRetry()` |
| WG-07 | DLQ preservada | Status `failed` após `MAX_ATTEMPTS` |
| WG-08 | RLS preservado | Consumer usa `set_config` por tenant |
| WG-09 | Company isolation | Loop exclusivo `IMPETUS_AIOI_PILOT_TENANTS` |
| WG-10 | Idempotência preservada | `FOR UPDATE SKIP LOCKED` + idempotency_key |

---

## 3. Flags de ativação (explícitas)

| Flag | Default | Descrição |
|------|---------|-----------|
| `IMPETUS_AIOI_ENABLED` | `false` | Master switch AIOI |
| `IMPETUS_AIOI_OUTBOX_WORKER_ENABLED` | `false` | Worker outbox |
| `IMPETUS_AIOI_PILOT_TENANTS` | — | UUIDs piloto (máx. 3) |
| `IMPETUS_AIOI_OUTBOX_WORKER_INTERVAL_MS` | `30000` | Intervalo ciclo |
| `IMPETUS_AIOI_OUTBOX_BATCH_SIZE` | `10` | Tamanho lote |

**Regra:** Worker só inicia se `IMPETUS_AIOI_ENABLED=true` **AND** `IMPETUS_AIOI_OUTBOX_WORKER_ENABLED=true`.

---

## 4. Proibições

- Execução autónoma de decision / execution / learning
- LLM, rerank, weight_versions
- Processamento fora de pilot tenants
- Alteração de retry/DLQ no consumer base

---

## 5. Token

**WORKER_GOVERNANCE_CERTIFIED**
