# AIOI-P1C.2 — Outbox Scale Validation

**Data:** 2026-06-12  
**Tenant de teste:** `ffd94fb8-79f4-4a38-af21-fe596adfffb5` (industria de teste)  
**Tag:** `P1C-SCALE-*`  
**Batch drain:** 100

---

## Metodologia

Cargas progressivas injetadas via INSERT atômico IOE+outbox (espelha `aioiEventIngestionService`), seguidas de drenagem completa via `aioiClassificationConsumerService.processClassificationBatch`.

---

## Resultados por Carga

### 100 Eventos

| Métrica | Valor |
|---|---|
| Injeção (ms) | 144 |
| Throughput injeção (eps) | 694 |
| Pending após injeção | 100 |
| Drenagem (ms) | 598 |
| Classificados | 100 |
| Falhas | 0 |
| Retries | 0 |
| Batches | 2 |
| Latência batch p50 | 2ms |
| Latência batch p95 | 596ms |
| Delivery rate | 100% |
| Lock contention | none |

### 500 Eventos

| Métrica | Valor |
|---|---|
| Injeção (ms) | 443 |
| Throughput injeção (eps) | 1,129 |
| Pending após injeção | 500 |
| Drenagem (ms) | 1,997 |
| Classificados | 500 |
| Falhas | 0 |
| Batches | 6 |
| Latência batch p50 | 342ms |
| Latência batch p95 | 487ms |
| Delivery rate | 100% |

### 1.000 Eventos

| Métrica | Valor |
|---|---|
| Injeção (ms) | 777 |
| Throughput injeção (eps) | 1,287 |
| Pending após injeção | 1,000 |
| Drenagem (ms) | 4,413 |
| Classificados | 1,000 |
| Falhas | 0 |
| Batches | 11 |
| Latência batch p50 | 423ms |
| Latência batch p95 | 617ms |
| Delivery rate | 100% |

### 5.000 Eventos

| Métrica | Valor |
|---|---|
| Injeção (ms) | 4,010 |
| Throughput injeção (eps) | 1,247 |
| Pending após injeção | 5,000 |
| Drenagem (ms) | 28,455 |
| Classificados | 5,000 |
| Falhas | 0 |
| Retries | 0 |
| Batches | 51 |
| Latência batch p50 | 485ms |
| Latência batch p95 | 1,227ms |
| Latência batch p99 | 1,582ms |
| Delivery rate | 100% |
| Lock contention | none |

---

## Curva de Escala

```
Injeção (eps):     694 → 1,129 → 1,287 → 1,247  (estável ~1.250 eps)
Drenagem (eps):    167 → 250   → 227   → 176    (estável ~150–250 eps)
Batch p95 (ms):    596 → 487   → 617   → 1,227  (linear com volume)
```

**Observação:** A injeção escala linearmente (~1.250 eventos/segundo). A drenagem (classificação end-to-end) limita a ~175–250 eventos/segundo em loop contínuo — este é o **throughput real do pipeline**.

---

## Estado Final do Outbox (pós todos os testes)

```json
{
  "total_records": 13155,
  "delivered": 13155,
  "pending": 0,
  "failed": 0,
  "table_size": "8.9 MB",
  "max_attempts_observed": 0
}
```

---

## Análise de Retries e Locks

| Aspecto | Resultado |
|---|---|
| Retries necessários | 0 em todas as cargas |
| SKIP LOCKED contention | Não observada |
| Items em `processing` stale | 0 |
| Duplicatas | 0 |

---

## Veredito

```json
{
  "loads_tested": [100, 500, 1000, 5000],
  "all_delivered": true,
  "all_failed_zero": true,
  "max_p95_batch_ms": 1227,
  "sustained_drain_eps": 176,
  "inject_eps": 1247
}
```

```
AIOI_P1C_OUTBOX_SCALE_PASS
```

Outbox comprovadamente estável até 5.000 eventos pendentes com drenagem completa em 28,5s e zero falhas.
