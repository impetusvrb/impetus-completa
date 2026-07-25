# WMS-004 — Operational Workspace

**Programa:** WMS Evolution  
**Entrega:** WMS-004  
**GAP alvo:** GAP-WMS-002  
**Data:** 2026-07-18

---

## Objetivo

Workspace operacional da Logística consumindo **exclusivamente** APIs públicas WMS-003 v1.

---

## Módulos

| Módulo | Rota | API v1 |
|--------|------|--------|
| Dashboard | `/workspace` | agregação list APIs |
| Armazéns | `/workspace/warehouses` | GET `/v1/warehouses` |
| Inventário | `/workspace/inventory` | GET `/v1/inventory/items` |
| Recebimento | `/workspace/receiving` | GET `/v1/receiving` |
| Picking | `/workspace/picking` | GET `/v1/picking` |
| Expedição | `/workspace/shipping` | GET `/v1/shipping` |
| Transferências | `/workspace/transfers` | GET `/v1/transfers` |

---

## Arquitectura

```
Frontend Workspace → wmsV1ApiClient → /api/logistics-operational/v1 → OCL
```

**Proibido:** mocks KPI, `/operations/overview`, acesso directo ao domínio.

---

## Feature flags (default false)

- `VITE_IMPETUS_LOGISTICS_ENABLED`
- `VITE_IMPETUS_LOGISTICS_MENU`
- `VITE_IMPETUS_LOGISTICS_WORKSPACE`

---

## Ficheiros

`frontend/src/domains/logistics-operational/`
