# AIOI-P1G — Parallel Execution Pilot

**Data:** 2026-06-13  
**Veredito:** `AIOI_P1G_PARALLEL_EXECUTION_PASS`

---

## Feature Flag

```env
IMPETUS_AIOI_PARALLEL_TENANT_EXECUTION=false   # produção default
```

Quando `true`: execução paralela **somente tenants piloto**.

---

## Benchmark Real (2 pilot tenants)

| Modo | throughput_eps | latency_p95_ms | memory_mb | cpu_ms |
|------|----------------|----------------|-----------|--------|
| Sequential | 74.07 | 24 | 7.76 | 20.64 |
| Parallel | 117.65 | 17 | 7.95 | 11.52 |

**Speedup:** ~1.6× throughput · p95 reduzido 29%

---

## Regras Respeitadas

- Flag produção: **OFF** após certificação
- Parallel restringe a `pilotFlags.getPilotTenants()`
- Worker certificado delega via `aioiHorizontalActivationService.executeTenantPipeline()`
- Sem alteração quando flag OFF — loop sequencial preservado

---

## Critério

```json
{
  "parallel_execution_certified": true,
  "production_flag": false
}
```
