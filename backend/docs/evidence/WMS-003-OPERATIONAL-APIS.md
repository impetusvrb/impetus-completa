# WMS-003 — Operational APIs

**Programa:** WMS Evolution  
**Entrega:** WMS-003  
**GAP fechado:** GAP-WMS-001  
**Governança:** REV-001 conformant  
**Data:** 2026-07-18

---

## Objetivo

APIs operacionais reais via **OCL exclusivo** — substituindo stubs WMS-002.

**Base path:** `/api/logistics-operational/v1`

---

## Fluxo

```
Cliente → REST → Controller → Validation → OCL → Routing Policy → Core/Repos → Legacy Adapter
```

---

## Endpoints implementados

### Inventory
| Método | Path |
|--------|------|
| GET | `/v1/inventory/items` |
| GET | `/v1/inventory/items/:id` |
| POST | `/v1/inventory/items` |
| GET | `/v1/inventory/balances` |
| GET | `/v1/inventory/movements` |
| GET | `/v1/inventory/movements/:id` |
| POST | `/v1/inventory/movements` |

### Warehouse
| Método | Path |
|--------|------|
| GET | `/v1/warehouses` |
| POST | `/v1/warehouses` |
| GET | `/v1/warehouses/:id` |
| GET | `/v1/warehouses/:id/locations` |
| GET | `/v1/warehouses/:id/capacity` |

### Receiving / Picking / Shipping / Transfer
| Domínio | Operações |
|---------|-----------|
| Receiving | list, create, get, PATCH status |
| Picking | list, create, get, execute, complete |
| Shipping | list, create, get, dispatch |
| Transfer | list, create, get, complete |

---

## Componentes

| Camada | Path |
|--------|------|
| Routes v1 | `routes/wmsV1Routes.js` |
| Controllers | `controllers/wmsOperationalApiControllers.js` |
| API gate | `middleware/wmsApiGate.js` |
| Observability | `shared/wmsApiObservability.js` |
| OCL complement | `compatibility/operationalCompatibilityLayer.js` (WMS-003 block) |

---

## Restrições cumpridas

- Controllers **não** acedem serviços directamente
- **Sem** menu / dashboard / CC
- **Sem** integração Supply
- Flags API **default false**

---

*RBAC:* [WMS-003-RBAC.md](./WMS-003-RBAC.md)
