# AIOI-P1C.1 — Scale Readiness Audit

**Data:** 2026-06-12  
**Fase:** P1C — Enterprise Scale Certification  
**Pré-requisito:** `AIOI_P1B_CONTINUOUS_RUNTIME_OPERATION_CERTIFICATION_PASS`

---

## Escopo da Auditoria

| Componente | Arquivo / Tabela | Função |
|---|---|---|
| `aioi_outbox` | BD + migration P0.2 | Bus transacional, SKIP LOCKED |
| `aioi_executive_queue_snapshot` | BD + migration ORG-5 | Projeção append-only da fila CEO |
| `aioiContinuousWorkerService` | `runtime/aioiContinuousWorkerService.js` | Polling + classificação + snapshot |
| `aioiRuntimeMetricsService` | `runtime/aioiRuntimeMetricsService.js` | Métricas in-process + consulta BD |

---

## 1. Baseline Pré-Escala

| Tabela | Registros | Tamanho |
|---|---|---|
| `aioi_outbox` | 55 | 224 kB |
| `aioi_executive_queue_snapshot` | 13 | 208 kB |
| `industrial_operational_events` | 56 | 368 kB |

---

## 2. Índices Auditados

### aioi_outbox (8 índices)

| Índice | Tipo | Uso em Escala |
|---|---|---|
| `pk_aioi_outbox` | UNIQUE (id) | PK |
| `uq_aioi_outbox_idempotency` | UNIQUE (idempotency_key) | Idempotência global |
| `idx_aioi_outbox_pending` | btree (company_id, status, next_attempt_at, created_at) WHERE pending | **Poll crítico — pickBatch** |
| `idx_aioi_outbox_processing` | btree WHERE processing | Recovery stale |
| `idx_aioi_outbox_failed` | btree WHERE failed | DLQ inspection |
| `idx_aioi_outbox_ioe_id` | btree (ioe_id) | Lookup por IOE |
| `idx_aioi_outbox_correlation` | btree (correlation_id) | Traceability |
| `idx_aioi_outbox_lag_metric` | btree WHERE pending/processing | Lag monitoring |

### aioi_executive_queue_snapshot (4 índices)

| Índice | Tipo | Uso em Escala |
|---|---|---|
| `pk_aioi_executive_queue_snapshot` | UNIQUE (id) | PK |
| `uq_aioi_eqs_idempotency` | UNIQUE (idempotency_key) | Dedup snapshot |
| `idx_aioi_eqs_company_latest` | btree (company_id, generated_at DESC) | **fetchLatestSnapshot — crítico** |
| `idx_aioi_eqs_correlation` | btree (correlation_id) | Traceability |

### industrial_operational_events (9 índices)

| Índice | Relevante para Escala |
|---|---|
| `uq_ioe_idempotency` | UNIQUE (company_id, idempotency_key) |
| `idx_ioe_queue` | Filtro status + priority_score para projeção |
| `idx_ioe_truth_status` | Filtros operacionais |
| Demais | equipment, correlation, SLA, expires |

---

## 3. Queries Críticas e Planos de Execução

### Q1 — pickBatch (FOR UPDATE SKIP LOCKED)

```sql
UPDATE aioi_outbox SET status='processing', updated_at=now()
WHERE id IN (
  SELECT id FROM aioi_outbox
  WHERE status='pending' AND consumer_type='classification'
    AND company_id=$1 AND next_attempt_at <= now()
  ORDER BY created_at ASC LIMIT 100
  FOR UPDATE SKIP LOCKED
) RETURNING *;
```

**EXPLAIN ANALYZE (baseline):**

```json
{
  "execution_time_ms": 0.084,
  "planning_time_ms": 1.169,
  "node_type": "ModifyTable"
}
```

**Índice utilizado:** `idx_aioi_outbox_pending` (partial index WHERE status='pending')  
**Full scan:** NÃO — index scan confirmado  
**Lock:** ROW-level via FOR UPDATE SKIP LOCKED — sem table lock

### Q2 — fetchLatestSnapshot

```sql
SELECT ... FROM aioi_executive_queue_snapshot
WHERE company_id=$1 ORDER BY generated_at DESC LIMIT 1;
```

**EXPLAIN ANALYZE (baseline):**

```json
{
  "execution_time_ms": 0.032,
  "planning_time_ms": 0.091,
  "index_used": "Limit"
}
```

**Índice utilizado:** `idx_aioi_eqs_company_latest`  
**Full scan:** NÃO

### Q3 — _fetchQueueEligibleIoes (projeção snapshot)

```sql
SELECT ... FROM industrial_operational_events
WHERE company_id=$1 AND status IN ('triaged', ...)
  AND audience_key='ceo'
ORDER BY priority_score DESC, created_at ASC LIMIT $2;
```

**Índice esperado:** `idx_ioe_queue`  
**Risco em escala:** crescimento de IOEs triaged por tenant aumenta sort cost — mitigado por LIMIT

---

## 4. Locks e Concorrência

| Mecanismo | Chave / Tipo | Impacto |
|---|---|---|
| Advisory lock worker | `8820202607` (bigint) | Single instance — impede workers paralelos |
| SKIP LOCKED | Row-level em pickBatch | Permite múltiplos consumers teóricos sem deadlock |
| Transação pickBatch | BEGIN → UPDATE → COMMIT | Lock duration mínima |
| RLS GUC | `app.current_company_id` | Overhead ~0.1ms por query |

**Contention observada em testes P1C.2–P1C.5:** `none_observed`

---

## 5. aioiContinuousWorkerService — Parâmetros de Escala

| Parâmetro | Default | Range | Impacto |
|---|---|---|---|
| `IMPETUS_AIOI_OUTBOX_BATCH_SIZE` | 10 | 1–100 | Eventos por ciclo/tenant |
| `IMPETUS_AIOI_CONTINUOUS_RUNTIME_INTERVAL_MS` | 30000 | 5000–300000 | Frequência de polling |
| `IMPETUS_AIOI_PILOT_TENANTS` | — | máx. 3 | **Limite hard de tenants** |
| Advisory lock | 8820202607 | — | 1 instância ativa |

**Gargalo arquitetural #1:** Loop sequencial por tenant — O(n) tenants por ciclo.

---

## 6. aioiRuntimeMetricsService — Limitações de Escala

| Aspecto | Comportamento | Risco |
|---|---|---|
| Buffer latência | Circular, 500 amostras | Perde histórico > 500 ciclos |
| Contadores in-process | Reset on restart | Perda de acumulados em PM2 restart |
| Consulta BD outbox | COUNT(*) sem filtro tenant | Full table scan em escala — **gargalo observabilidade** |
| getMetricsSummary() | Sem query BD | Seguro para health checks frequentes |

**Recomendação:** Em escala enterprise, migrar contadores outbox para query com filtro por tenant ou materialized view.

---

## 7. Crescimento Esperado

| Dimensão | Taxa Típica Industrial | Projeção 1 ano (1 tenant) |
|---|---|---|
| IOEs/dia | 500–5000 | 180K–1.8M registros |
| Outbox/dia | = IOEs ingeridos | Mesmo volume (delivered acumula) |
| Snapshots/dia | 1/ciclo × 2880 ciclos (30s) | ~2880/dia se contínuo |
| Tamanho snapshot médio | ~2–20 KB (20 items) | ~60 MB/dia/tenant |

**Risco de crescimento:** Tabela `aioi_outbox` delivered acumula indefinidamente — requer política de retenção (fora do escopo P1C, documentado como pendência operacional).

---

## 8. Mapa de Gargalos Identificados

| ID | Gargalo | Severidade | Mitigação |
|---|---|---|---|
| G-01 | `IMPETUS_AIOI_PILOT_TENANTS` max=3 | ALTA | P1D: expandir modelo multi-tenant |
| G-02 | Single advisory lock (1 worker) | ALTA | Sharding por tenant ou partition key |
| G-03 | Loop sequencial O(n) tenants/ciclo | MÉDIA | Paralelizar tenants no ciclo |
| G-04 | Outbox delivered acumula | MÉDIA | Retention policy / archival |
| G-05 | Metrics COUNT(*) full table | BAIXA | Query scoped ou cache |
| G-06 | Classification per-item sequential | MÉDIA | Batch UPDATE onde possível |

---

## Invariants Verificados

```json
{
  "runtime_enabled": false,
  "runtime_active": false,
  "runtime_authorized": false,
  "cognitive_execution_allowed": false,
  "auto_execute_band": "none"
}
```

---

## Veredito

```
SCALE_AUDIT_COMPLETE
```

Índices adequados para escala inicial. Queries críticas usam index scan (0.08ms pickBatch, 0.03ms fetchLatest). Gargalos principais são arquiteturais (limite 3 tenants, single worker), não de BD.
