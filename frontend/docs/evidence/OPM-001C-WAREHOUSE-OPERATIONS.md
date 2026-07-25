# OPM-001C — Warehouse Operations (Safe Transaction Layer)

**Programa:** Operational Product Maturation (OPM)  
**Entrega:** OPM-001C  
**Modo:** SAFE INCREMENTAL IMPLEMENTATION  
**Data:** 2026-07-19

---

## Declaração de conformidade

```
PRESENTATION_PRIMARY           = YES
BACKEND_API_CONTRACT_CHANGED   = NO
NEW_ENDPOINTS_CREATED          = NO
OPM-001A_MODIFIED              = NO
WMS-007A_FRAME_MODIFIED        = NO
OTHER_WMS_MODULES_MODIFIED     = NO
RBAC_DEFINITIONS_MODIFIED      = NO
NAVIGATION_MODIFIED            = NO
```

---

## Objectivo

Iniciar a **camada operacional transaccional** do módulo Warehouse sobre infraestrutura WMS-003 certificada, sem CRUD genérico nem alteração de contratos.

---

## Operações implementadas

| Operação | API | Status |
|----------|-----|--------|
| **Novo armazém** | `POST /warehouses` | ✅ Implementado |
| **Editar** | — | ⚠️ GAP-OPM-WH-006 (shell informativo) |
| **Desactivar** | — | ⚠️ GAP-OPM-WH-007 |
| **Consulta / listagem** | OPM-001B preservado | ✅ |
| **Posições** | `GET /warehouses/:id/locations` | ✅ |
| **Capacidade / ocupação** | `GET /warehouses/:id/capacity` | ✅ |
| **Movimentações** | `GET /inventory/movements` (filtro local) | ✅ |
| **Timeline operacional** | Derivação local | ✅ |
| **Export CSV** | Client-side | ✅ |

---

## Camada de segurança

- `warehouseOperationsGuard.js` — valida Feature Flags + RBAC antes de cada operação
- `warehouseOperationsRbac.js` — espelho `warehouse.write` (sem alterar `wmsRbacNavigation.js`)
- `warehouseTransactionClient.js` — POST existente com observabilidade `WH_CREATE_*`

---

## Componentes novos (warehouse domain only)

```
modules/warehouse/
├── warehouseOperationsGuard.js
├── warehouseOperationsRbac.js
├── warehouseTransactionClient.js
├── useWarehouseOperations.js
├── WarehouseCreateModal.jsx
├── WarehouseEditShell.jsx
├── WarehouseWorkflowShell.jsx
├── WarehouseLocationsPanel.jsx
├── WarehouseMovementsPanel.jsx
└── warehouseTimelineUtils.js
```

---

## Parecer

**OPM-001C — COMPLETED**
