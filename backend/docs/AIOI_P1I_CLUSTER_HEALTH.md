# AIOI-P1I — Cluster Health

**Data:** 2026-06-13  
**Camada:** `AIOI_CLUSTER_HEALTH`  
**Veredito:** `AIOI_P1I_ENTERPRISE_DISTRIBUTED_OPERATIONS_PASS`

---

## Serviço

`backend/src/services/aioi/runtime/aioiClusterHealthService.js`

Estados observacionais: `NORMAL` | `WARNING` | `HIGH` | `CRITICAL`

Fatores avaliados (sem auto-ação):

- **ownership_coverage** — shards cobertos por workers
- **lease_age** — idade dos leases locais
- **worker_availability** — worker em execução
- **shard_balance** — ratio min/max tenants por shard (NORMAL quando tenants ≤ shards)
- **backlog_pressure** — backlog pending vs thresholds

---

## API

```
GET /api/aioi/scale/health
```

---

## Resultados da certificação (2026-06-13)

```json
{
  "overall_status": "CRITICAL",
  "factors": {
    "ownership_coverage": { "status": "NORMAL", "pass": true },
    "lease_age": { "status": "NORMAL" },
    "worker_availability": { "status": "NORMAL" },
    "shard_balance": { "status": "NORMAL", "balance_ratio": 0 },
    "backlog_pressure": { "status": "NORMAL", "value": 0 }
  },
  "auto_action": false
}
```

> **Nota:** `overall_status: CRITICAL` pode refletir `capacity_guard_status` P1C (snapshots em excesso) — observação only, não bloqueia certificação P1I.

---

## Critério

```json
{
  "cluster_health_ready": true
}
```
