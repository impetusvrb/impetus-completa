# AIOI-P1C.5 — Backlog Stress Certification

**Data:** 2026-06-12  
**Tenant:** `ffd94fb8-79f4-4a38-af21-fe596adfffb5`  
**Batch drain:** 100 eventos/batch

---

## Objetivo

Validar comportamento do pipeline sob backlog elevado: tempo de drenagem, estabilidade, retries e starvation.

---

## Cenário: 500 Pendentes

| Métrica | Valor |
|---|---|
| Injetados | 500 |
| Pending antes drenagem | 500 |
| Tempo drenagem | 3,286ms |
| Classificados | 500 |
| Falhas | 0 |
| Retries | 0 |
| Batches | 6 |
| Pending restante | **0** |
| Drain rate | 152 eps |
| Latência batch p50 | 583ms |
| Latência batch p95 | 770ms |
| Starvation | none |

---

## Cenário: 1.000 Pendentes

| Métrica | Valor |
|---|---|
| Injetados | 1,000 |
| Pending antes drenagem | 1,000 |
| Tempo drenagem | 6,566ms |
| Classificados | 1,000 |
| Falhas | 0 |
| Retries | 0 |
| Batches | 11 |
| Pending restante | **0** |
| Drain rate | 152 eps |
| Latência batch p50 | 618ms |
| Latência batch p95 | 824ms |
| Starvation | none |

---

## Cenário: 5.000 Pendentes

| Métrica | Valor |
|---|---|
| Injetados | 5,000 |
| Pending antes drenagem | 5,000 |
| Tempo drenagem | **26,132ms** (~26s) |
| Classificados | 5,000 |
| Falhas | 0 |
| Retries | 0 |
| Batches | 51 |
| Pending restante | **0** |
| Drain rate | **191 eps** |
| Latência batch p50 | 483ms |
| Latência batch p95 | 753ms |
| Latência batch p99 | 782ms |
| Starvation | none |

---

## Curva de Drenagem

```
Backlog    Drain Time    Rate (eps)    p95 batch
  500  →    3.3s           152           770ms
 1000  →    6.6s           152           824ms
 5000  →   26.1s           191           753ms
```

**Observação:** Taxa de drenagem **aumenta** com backlog maior (191 vs 152 eps) — batch amortiza overhead de conexão/transação. Sem degradação runaway.

---

## Estabilidade e Retries

| Aspecto | 500 | 1.000 | 5.000 |
|---|---|---|---|
| Falhas outbox | 0 | 0 | 0 |
| Retries | 0 | 0 | 0 |
| Items stuck processing | 0 | 0 | 0 |
| Starvation | none | none | none |
| Duplicatas pós-drenagem | 0 | 0 | 0 |

---

## Tempo de Recuperação com Worker Default

Com `interval=30s` e `batch=10` (config default):

```
5000 pending ÷ (3 tenants × 10 batch) = 5000 ÷ 30 = ~167 ciclos
167 × 30s = ~83 minutos para drenagem passiva
```

Com `batch=100` (certificado P1C):

```
5000 ÷ (3 × 100) = ~17 ciclos × 30s = ~8.5 minutos passivo
Drenagem ativa contínua: 26 segundos (medido)
```

**Recomendação operacional:** Manter `batch_size=100` em ambientes com backlog potencial > 500 eventos.

---

## Veredito

```json
{
  "backlogs_tested": [500, 1000, 5000],
  "all_drained_completely": true,
  "max_drain_time_ms": 26132,
  "max_drain_time_human": "26s",
  "retries_required": 0,
  "starvation_observed": false,
  "sustained_drain_eps": 191
}
```

```
AIOI_P1C_BACKLOG_STRESS_PASS
```

Backlog de 5.000 eventos drenado completamente em 26 segundos sem falhas, retries ou starvation.
