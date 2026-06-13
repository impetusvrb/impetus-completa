# AIOI-P1B.2 — Controlled Continuous Operation Log

**Data:** 2026-06-12T21:00:35Z — 2026-06-12T21:00:37Z  
**Fase:** P1B — Continuous Runtime Operational Certification

---

## Operação Supervisionada

Pipeline completo executado em **3 rounds** de operação contínua supervisionada, cobrindo os dois tenants piloto certificados.

---

## Round 1 — Ingestão + Classificação + Snapshot

**Início:** 2026-06-12T21:00:35.472Z

### Ingestão

| Tenant | Eventos OK | Duplicatas | Falhas |
|---|---|---|---|
| find fish alimentos | 5 | 0 | 0 |
| industria de teste | 5 | 0 | 0 |
| **TOTAL** | **10** | **0** | **0** |

```
Tipos ingeridos: equipment_failure, production_deviation, quality_issue,
                 maintenance_required, equipment_degradation
Fonte: P1B_SOAK_R2
Severidades: critical, high, medium, high, low
```

### Classificação

```json
{
  "classified": 10,
  "failed":     0,
  "elapsed_ms": 783
}
```

### Snapshot

```json
{
  "snapshots_generated": 2,
  "tenants_updated":     2
}
```

### Estado do BD após Round 1

```json
{
  "outbox_delivered": 34,
  "outbox_pending":   0,
  "ioe_triaged":      34,
  "snapshots_total":  12
}
```

---

## Round 2 — Ingestão + Classificação + Snapshot

### Ingestão

| Tenant | Eventos OK | Duplicatas | Falhas |
|---|---|---|---|
| find fish alimentos | 5 | 0 | 0 |
| industria de teste | 5 | 0 | 0 |
| **TOTAL** | **10** | **0** | **0** |

### Classificação

```json
{
  "classified": 10,
  "failed":     0,
  "elapsed_ms": 211
}
```

**Observação:** Latência reduzida — pool DB aquecido após Round 1.

---

## Round 3 — Ingestão + Classificação + Snapshot

### Ingestão

```json
{ "ok": 10, "dup": 0, "fail": 0 }
```

### Classificação

```json
{
  "classified": 10,
  "failed":     0,
  "elapsed_ms": 83
}
```

**Observação:** Latência mínima — demonstra estabilidade crescente com pool aquecido.

---

## Teste de Idempotência

Re-ingestão do Round 2 (mesmos `idempotency_key`):

```json
{
  "duplicates_blocked": 10,
  "new_events":          0,
  "failures":            0
}
```

**Resultado:** `uq_aioi_outbox_idempotency` bloqueou 100% das duplicatas. ✓

---

## Sumário Acumulado dos 3 Rounds

```json
{
  "total_rounds":        3,
  "total_injected":      30,
  "total_classified":    30,
  "total_failed":        0,
  "total_snapshots":     2,
  "classification_rate": "100%",
  "failure_rate":        "0%",
  "total_elapsed_ms":    2018,
  "throughput_eps":      "~15 eventos/segundo"
}
```

---

## Métricas de Runtime Coletadas

```json
{
  "layer":                "AIOI_RUNTIME_METRICS",
  "timestamp":            "2026-06-12T21:00:37.485Z",
  "cycle_count":          3,
  "ingested_events":      30,
  "classified_events":    30,
  "projected_snapshots":  2,
  "outbox_pending":       0,
  "outbox_delivered":     54,
  "outbox_failed":        0,
  "dlq_count":            0,
  "latency_p50":          211,
  "latency_p95":          783,
  "latency_p99":          783,
  "latency_count":        3,
  "latency_min":          83,
  "latency_max":          783
}
```

---

## Estado Final do BD

```json
{
  "outbox": { "delivered": 55 },
  "ioe":    { "triaged": 55, "open": 1 },
  "snapshots_total": 13,
  "outbox_failed": 0,
  "max_attempts":  0
}
```

**Nota:** O 1 IOE em `open` é de tenant não-piloto (`60c76fe6`), criado em fase P0D. Não pertence ao escopo P1B.

---

## Invariants Verificados Durante Operação

```json
{
  "runtime_enabled":             false,
  "runtime_active":              false,
  "runtime_authorized":          false,
  "cognitive_execution_allowed": false,
  "auto_execute_band":           "none"
}
```

**Status:** ✓ PRESERVADOS durante toda a operação

---

## Veredito

```
CONTINUOUS_OPERATION_VALIDATED
```

Pipeline operacional contínuo executado com 0 falhas em 3 rounds, 30 eventos processados, 100% de taxa de classificação.
