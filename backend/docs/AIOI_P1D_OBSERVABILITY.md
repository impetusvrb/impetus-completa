# AIOI-P1D.3 — Observability Hardening

**Data:** 2026-06-12  
**Serviço:** `backend/src/services/aioi/runtime/aioiRuntimeAggregationService.js`

---

## Problema Resolvido (P1C G-05)

`aioiRuntimeMetricsService._fetchOutboxCounters()` executava `COUNT(*)` full-table a cada health check.

---

## Solução

| Mecanismo | Implementação |
|---|---|
| Cache interno | `_cache` com timestamp |
| Refresh periódico | `startPeriodicRefresh()` no server boot |
| Intervalo | `IMPETUS_AIOI_AGGREGATION_REFRESH_MS=60000` |
| API | `getRuntimeAggregateMetrics()` — retorna cache se fresco |

---

## Dados Agregados

```json
{
  "outbox": { "pending", "processing", "delivered", "failed" },
  "outbox_total": 13155,
  "snapshots_total": 11114,
  "snapshot_tenant_count": 2,
  "ioe_by_status": { "triaged", "open" },
  "storage_bytes": { "outbox", "snapshots", "ioe" },
  "in_process": { "latency_p50", "cycle_count", ... }
}
```

---

## Boot / Shutdown

```
Server boot  → startPeriodicRefresh() + refreshAggregateCache()
Server shutdown → stopPeriodicRefresh()
```

---

## Endpoints que devem usar agregação (P1D.6)

- `GET /api/aioi/governance/status` ✓
- `GET /api/aioi/governance/capacity` ✓

**Endpoints P1A inalterados** — compatibilidade preservada.

---

## Veredito

```
AIOI_P1D_OBSERVABILITY_HARDENED
```
