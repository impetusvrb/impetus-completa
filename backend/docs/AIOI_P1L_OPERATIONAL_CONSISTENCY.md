# AIOI-P1L — Operational Consistency

**Data:** 2026-06-13  
**Veredito:** `AIOI_P1L_ENTERPRISE_OPERATIONAL_CERTIFICATION_PASS`

---

## Serviço

`backend/src/services/aioi/runtime/aioiOperationalConsistencyService.js`

Validações READ ONLY:

- Idempotência (`idempotency_key` único por tenant)
- Ordenação outbox (`created_at` monotónico)
- Integridade de status IOE
- Referências outbox → IOE

---

## Resultados (2026-06-13)

```json
{
  "idempotent": true,
  "ordering_preserved": true,
  "consistency_certified": true,
  "checks": {
    "duplicate_idempotency_groups": 0,
    "outbox_ordering_inversions": 0,
    "orphan_outbox_refs": 0,
    "invalid_ioe_status": 0
  }
}
```

---

## API

```
GET /api/aioi/operations/consistency
```
