# WMS-001 — Operational Foundation (Logistics)

**Programa:** Operational Completion Program  
**Fase:** 1 — Foundation  
**Data:** 2026-07-17  
**Pré-requisito:** AUD-001  
**Baseline preservado:** BASELINE-SYSTEM v1.4 · BASELINE-LOGISTICS-v1.1 (logistics_native LOCKED)

---

## Critérios de encerramento

```
WMS_FOUNDATION_CREATED             = YES
LOGISTICS_OPERATIONAL_DOMAIN       = YES
SSOT_ESTABLISHED                   = YES
FOUNDATION_APIS_REGISTERED         = YES
FOUNDATION_SERVICES_CREATED        = YES
FOUNDATION_REPOSITORIES_CREATED    = YES
FOUNDATION_SCHEMAS_CREATED         = YES
FRONTEND_WORKSPACE_CREATED         = YES
FEATURE_FLAGS_CREATED              = YES
RBAC_CREATED                       = YES
MENU_VISIBLE                       = NO
PRODUCTION_ENABLED                 = NO
LOGISTICS_NATIVE_MODIFIED          = NO
BASELINE_SYSTEM_v1.4               = PRESERVED
ARC_001_CONFORMANCE                = PRESERVED (sem alteração cognitive runtime)
```

---

## Entregáveis

| Artefacto | Caminho |
|-----------|---------|
| Migration SSOT (12 entidades) | `backend/migrations/logistics_operational_foundation_migration.sql` |
| Domínio operacional | `backend/src/domains/logistics-operational/` |
| APIs foundation | `GET/POST /api/logistics-operational/*` |
| Testes | `npm run test:wms-foundation` |
| FE workspace | `frontend/src/domains/logistics-operational/` |
| Rota FE (oculta) | `/app/logistics-operational/workspace` |
| Arquitectura | `backend/docs/evidence/WMS-ARCHITECTURE-v0.1.md` |
| Roadmap | `backend/docs/architecture/WMS-IMPLEMENTATION-ROADMAP.md` |

---

## Entidades SSOT (`wms_*`)

| Entidade | Tabela |
|----------|--------|
| Warehouse | `wms_warehouses` |
| WarehouseLocation | `wms_warehouse_locations` |
| StorageAddress | `wms_storage_addresses` |
| InventoryItem | `wms_inventory_items` |
| InventoryBalance | `wms_inventory_balances` |
| InventoryMovement | `wms_inventory_movements` |
| PickingOrder | `wms_picking_orders` |
| ReceivingOrder | `wms_receiving_orders` |
| ShippingOrder | `wms_shipping_orders` |
| TransferOrder | `wms_transfer_orders` |
| Container | `wms_containers` |
| HandlingUnit | `wms_handling_units` |

---

## Feature flags (default **false**)

| Env backend | Alias documental |
|-------------|------------------|
| `IMPETUS_WMS_OPERATIONAL_ENABLED` | `wms_operational_enabled` |
| `IMPETUS_WMS_INVENTORY_ENABLED` | `wms_inventory_enabled` |
| `IMPETUS_WMS_RECEIVING_ENABLED` | `wms_receiving_enabled` |
| `IMPETUS_WMS_SHIPPING_ENABLED` | `wms_shipping_enabled` |
| `IMPETUS_WMS_PICKING_ENABLED` | `wms_picking_enabled` |
| `IMPETUS_WMS_TRANSFER_ENABLED` | `wms_transfer_enabled` |

Espelho Vite: `VITE_IMPETUS_WMS_*`

---

## RBAC estrutural (não activado)

- `warehouse_operator` — Warehouse Operator  
- `warehouse_supervisor` — Warehouse Supervisor  
- `warehouse_manager` — Warehouse Manager  

Definições: `shared/wmsRbacDefinitions.js` · `activated: false`

---

## Inventário legado e estratégia de migração (obrigatório AUD-001)

### Stack legado `warehouse_*`

| Componente | Estado WMS-001 | Estratégia WMS-002+ |
|------------|----------------|---------------------|
| `warehouse_materials`, `warehouse_balances`, `warehouse_movements` | **Read-only reference** | Migrar saldos/movements para `wms_inventory_*` via adapter; deprecar UI legacy |
| `warehouse_intelligence` API/FE | **Mantido** | Redirect gradual para workspace WMS |
| `warehouse_locations` | **Mantido** | Mapear para `wms_storage_addresses` |
| Admin `/app/admin/warehouse` | **Mantido** | Coexistência até WMS-005 |

### Stack foundation M1.2 `logistics_*`

| Tabela | Estado | Estratégia |
|--------|--------|------------|
| `logistics_inventory`, `logistics_receipts`, `logistics_shipments`, `logistics_lot_tracking` | **Preservada** | Bridge read-only no signal loader cognitivo; WMS-002 escreve em `wms_*`, sync opcional |

### Stack TMS legacy `logistics_*` intelligence

| Componente | Estratégia |
|------------|------------|
| `logistics_vehicles`, `expeditions`, `routes` | **Reaproveitar** para TMS; não duplicar em WMS |
| `/api/logistics-intelligence` | Manter; corrigir path FE em WMS-003 |

### Princípio SSOT

> **Uma arquitectura operacional:** `wms_*` + domínio `logistics-operational` para WMS interno; TMS/frota permanece em intelligence legacy até programa TMS dedicado.

---

## Superfícies não alteradas

- `cognitiveRuntime/domains/logistics/**` (logistics_native)
- `LogisticsNativeCockpitPromotion.jsx` e 7 hubs CC
- PPAP · MSA · Ishikawa runtimes
- BASELINE-SYSTEM v1.4 registry

---

## Testes

```bash
cd backend && npm run test:wms-foundation
```

Valida: migration, schemas, repositories CRUD, services contracts, flags, RBAC, integrations, domain registry.

---

## Próxima fase

**WMS-002 — Core Operational Services** (ver `WMS-IMPLEMENTATION-ROADMAP.md`)
