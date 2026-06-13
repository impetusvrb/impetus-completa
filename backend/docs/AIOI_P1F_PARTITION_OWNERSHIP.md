# AIOI-P1F — Partition Ownership Certification

**Data:** 2026-06-13  
**Modo:** SHADOW · READ ONLY  
**Serviço:** `aioiTenantPartitionService.js`

---

## Objetivo

Validar distribuição determinística, estabilidade entre reinícios, reatribuição controlada e balanceamento de tenants por shard.

---

## Cenários Executados

### 10 Tenants (2 shards)

| Métrica | Valor |
|---------|-------|
| Determinístico | ✓ |
| Balance ratio | 0.67 |
| Shard 0 | 6 tenants |
| Shard 1 | 4 tenants |
| Reassignment (2 workers) | 0 conflicts |
| **Pass** | ✓ |

### 50 Tenants (2 shards)

| Métrica | Valor |
|---------|-------|
| Determinístico | ✓ |
| Balance ratio | 0.56 |
| Shard 0 | 32 tenants |
| Shard 1 | 18 tenants |
| Reassignment (2 workers) | 0 conflicts |
| **Pass** | ✓ |

### 100 Tenants (4 shards)

| Métrica | Valor |
|---------|-------|
| Determinístico | ✓ |
| Balance ratio | 0.79 |
| Shard 0 | 28 tenants |
| Shard 1 | 27 tenants |
| Shard 2 | 22 tenants |
| Shard 3 | 23 tenants |
| Reassignment (2 workers) | 0 conflicts, 4 shards covered |
| **Pass** | ✓ |

---

## Estabilidade entre Reinícios

Duas execuções consecutivas de `calculateTenantPartition()` para os mesmos 100 tenants produziram assignments idênticos — particionamento estável e determinístico (hash SHA-256).

---

## Reatribuição Controlada

Simulação com 2 workers (`IMPETUS_AIOI_WORKER_COUNT=2`):

- Worker 0 → shards [0, 2]
- Worker 1 → shards [1, 3]
- `ownership_conflicts: 0`
- Todos os shards cobertos

---

## Veredito

**AIOI_P1F_PARTITION_OWNERSHIP_CERTIFICATION_PASS**

```json
{
  "partition_ownership_certified": true,
  "scenarios": [10, 50, 100],
  "all_deterministic": true
}
```

---

## Modo

`calculation_only` — nenhuma execução distribuída ativada.
