# GF-027 — Supply REST APIs

**Base:** `/api/supply/v1`  
**Contratos:** v0.2.0  
**Gate:** `IMPETUS_SUPPLY_API` (default false)

---

## Fluxo

```
Cliente → REST → Controller → Validation → Supply Runtime → Pilot Layer → Canonical Contracts
```

---

## Endpoints

| Recurso | Métodos |
|---------|---------|
| `/suppliers` | GET, POST |
| `/suppliers/:id` | GET |
| `/categories` | GET, POST |
| `/categories/:id` | GET |
| `/spend-centers` | GET, POST |
| `/spend-centers/:id` | GET |
| `/purchase-requests` | GET, POST |
| `/purchase-requests/:id` | GET |
| `/purchase-requests/:id/submit` | POST |
| `/purchase-requests/:id/approve` | POST |
| `/purchase-orders` | GET, POST |
| `/purchase-orders/:id` | GET |
| `/quotations` | GET, POST |
| `/quotations/:id` | GET |
| `/contracts` | GET, POST |
| `/contracts/:id` | GET |
| `/approvals` | GET, POST |
| `/approvals/:id` | GET |
| `/approvals/:id/execute` | POST |
| `/pilot/integration` | POST |
| `/meta` | GET |

---

## Isolamento

**Proibido:** import OCL, controllers WMS, repos logistics-operational.

**Integração Logística:** exclusivamente via `supplyPilotIntegrationLayer`.

---

## Ficheiros

- `domains/supply/routes/supplyRoutes.js`
- `domains/supply/routes/supplyV1Routes.js`
- `domains/supply/controllers/supplyApiControllers.js`
- `domains/supply/services/supplyApiService.js`
