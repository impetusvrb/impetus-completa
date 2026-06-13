# AIOI-P1G — Shard Ownership Runtime

**Data:** 2026-06-13  
**Veredito:** `AIOI_P1G_SHARD_OWNERSHIP_PASS`

---

## Configuração

```env
IMPETUS_AIOI_OWNERSHIP_RUNTIME_ACTIVE=false   # default
IMPETUS_AIOI_WORKER_COUNT=1                   # single worker — sem distribuição
```

---

## Validação

| Cenário | Determinístico | Pass |
|---------|----------------|------|
| 10 tenants | ✓ | ✓ |
| 50 tenants | ✓ | ✓ |
| 100 tenants | ✓ | ✓ |

### Runtime State (flag ON, 1 worker)

```json
{
  "active": true,
  "worker_count": 1,
  "distributed": false,
  "shard_count": 1,
  "owned_shards": [0],
  "deterministic": true
}
```

---

## Integração no Ciclo

Quando `IMPETUS_AIOI_OWNERSHIP_RUNTIME_ACTIVE=true`:

1. `acquireOwnershipLeases()` — leases observacionais por shard
2. `calculateTenantPartition()` registado por tenant no log
3. `releaseOwnershipLeases()` no finally — sem vazamento

Lock P1A (`8820202607`) **preservado** — leases P1E usam base `8820202610`.

---

## Critério

```json
{
  "ownership_runtime_certified": true
}
```
