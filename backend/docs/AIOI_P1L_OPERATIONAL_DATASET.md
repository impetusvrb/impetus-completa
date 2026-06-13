# AIOI-P1L — Operational Dataset

**Data:** 2026-06-13  
**Camada:** `AIOI_OPERATIONAL_DATASET`  
**Veredito:** `AIOI_P1L_ENTERPRISE_OPERATIONAL_CERTIFICATION_PASS`

---

## Serviço

`backend/src/services/aioi/runtime/aioiOperationalDatasetService.js`

Valida datasets reais dos tenants piloto:

- `industrial_operational_events`
- `aioi_outbox`
- `aioi_executive_queue_snapshot`

---

## Resultados (2026-06-13)

```json
{
  "dataset_certified": true,
  "duplicates": 0,
  "corrupted_records": 0,
  "datasets": {
    "ioe": { "total": 13155, "tenant_count": 2 },
    "outbox": { "total": 13155 },
    "snapshots": { "total": 11128, "tenant_count": 2 }
  }
}
```

---

## API

```
GET /api/aioi/operations/dataset
```

READ ONLY.
