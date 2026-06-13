# AIOI-P1G — Performance Certification

**Data:** 2026-06-13  
**Veredito:** `AIOI_P1G_PERFORMANCE_PASS`

---

## Cenários (Sequential · handler real)

| Tenants | p50 (ms) | p95 (ms) | p99 (ms) | throughput_eps | memory_mb | cpu_ms |
|---------|----------|----------|----------|----------------|-----------|--------|
| 3 | 1 | 1 | 1 | 1000 | 14.43 | 1.88 |
| 10 | 1 | 4 | 4 | 625 | 14.75 | 15.05 |
| 25 | 1 | 3 | 5 | 833.33 | 10.30 | 22.48 |
| 50 | 1 | 2 | 4 | 961.54 | 11.83 | 36.82 |

---

## Comparações

### Registry OFF vs ON

| Modo | Source | Elapsed (ms) |
|------|--------|--------------|
| OFF | PILOT_TENANTS | 4 |
| ON | TENANT_REGISTRY | 1 |

Overhead registry: **negligível**.

### Sequential vs Parallel (2 pilot tenants)

| Modo | p95 (ms) | throughput_eps |
|------|----------|----------------|
| Sequential | 1 | 1000 |
| Parallel | 1 | 2000 |

### Ownership OFF vs ON

| Modo | worker_count | distributed |
|------|--------------|-------------|
| OFF | 1 | false |
| ON | 1 | false |

Ownership runtime não altera latência — apenas observação.

---

## Critério

```json
{
  "performance_certified": true
}
```
