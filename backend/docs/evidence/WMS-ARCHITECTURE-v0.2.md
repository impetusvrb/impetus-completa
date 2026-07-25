# WMS Architecture v0.2 — Operational Compatibility Layer

**Sucessor de:** [WMS-ARCHITECTURE-v0.1.md](./WMS-ARCHITECTURE-v0.1.md)  
**Programa:** WMS-002 ✅  
**Data:** 2026-07-17

---

## Delta v0.1 → v0.2

| v0.1 | v0.2 |
|------|------|
| Adapter mencionado genericamente | **Legacy Adapter** + **OCL** como fronteira obrigatória |
| Core Services TBD | Core Services **só** consomem OCL |
| Legado coexistência | Inventário formal + classificação + proibição acesso directo |

---

## Diagrama de camadas

```
┌──────────────────────────────────────────────────────────────┐
│ logistics_native (LOCKED) — CC · Signal Loader · Promotion    │
└────────────────────────────┬─────────────────────────────────┘
                             │ read-only (futuro via OCL export)
┌────────────────────────────▼─────────────────────────────────┐
│                    WMS Core Services                            │
│  Warehouse · Inventory · Movement · Receiving · Picking · …   │
└────────────────────────────┬─────────────────────────────────┘
                             │ só via interface
┌────────────────────────────▼─────────────────────────────────┐
│           Operational Compatibility Layer (OCL)               │
│  routingPolicy · resolveStrategy · observability              │
└──────────────┬─────────────────────────────┬─────────────────┘
               │                             │
┌──────────────▼──────────────┐   ┌──────────▼──────────────────┐
│     Legacy Adapter          │   │   wms_* repositories        │
│  warehouse_* (read)         │   │   (WMS-001 SSOT)            │
└─────────────────────────────┘   └─────────────────────────────┘
```

---

## §3 Operational Compatibility Layer

**Ficheiro:** `backend/src/domains/logistics-operational/compatibility/operationalCompatibilityLayer.js`

### Responsabilidades

| Função | Detalhe |
|--------|---------|
| Porta única | Core Services importam **apenas** `ocl.*` |
| Routing | `resolveRoutingStrategy(entity)` → `legacy` \| `wms` \| `hybrid` |
| Merge híbrido | Inventory items/balances: união wms + legacy sem duplicar código |
| Meta canónica | `_source`, `_routing` via `canonicalContracts.withMeta` |
| Métricas migração | `getMigrationStats(companyId)` |

### Sub-módulos

| Módulo | Função |
|--------|--------|
| `routingPolicy.js` | DEFAULT_ROUTING + overrides `IMPETUS_WMS_ROUTE_*` |
| `oclObservability.js` | Log estruturado por resolução |
| `contracts/canonicalContracts.js` | Tipos e meta SSOT |

### Routing default (WMS-002)

```
Warehouse, WarehouseLocation, StorageAddress, InventoryItem, InventoryBalance → hybrid
InventoryMovement, ReceivingOrder, PickingOrder, ShippingOrder, TransferOrder   → wms
```

---

## §4 Core Operational Services

**Ficheiro:** `backend/src/domains/logistics-operational/services/operationalServices.js`

| Serviço | Métodos principais | OCL namespace |
|---------|-------------------|---------------|
| `WarehouseService` | `list`, `create` | `ocl.warehouses` |
| `InventoryService` | `listItems`, `listBalances`, `createItem` | `ocl.inventory` |
| `MovementService` | `list`, `create` | `ocl.movements` |
| `ReceivingService` | `list`, `createOrder` | `ocl.receiving` |
| `PickingService` | `list`, `createOrder` | `ocl.picking` |
| `ShippingService` | `list`, `createOrder` | `ocl.shipping` |
| `TransferService` | `list`, `createOrder` | `ocl.transfers` |

Contrato uniforme: `{ service, phase: 'WMS-002', status: 'operational', ready: true, consumes: 'OCL' }`

Eventos `wms.*` emitidos após commit canónico via `eventBus` (quando disponível).

---

## Regra de dependência (enforcement WMS-002)

```
✅ CoreService → OCL → Adapter | wms_repository
❌ CoreService → warehouseService
❌ CoreService → db.query('warehouse_*')
❌ CoreService → cognitiveRuntime/domains/logistics/*
```

---

## Referências

- [WMS-002-OPERATIONAL-COMPATIBILITY-LAYER.md](./WMS-002-OPERATIONAL-COMPATIBILITY-LAYER.md)
- [WMS-002-CORE-SERVICES.md](./WMS-002-CORE-SERVICES.md)
- [WMS-MIGRATION-PROGRESS.md](./WMS-MIGRATION-PROGRESS.md)
- [WMS-LEGACY-WAREHOUSE-INVENTORY.md](./WMS-LEGACY-WAREHOUSE-INVENTORY.md)
- [WMS-IMPLEMENTATION-ROADMAP.md](../architecture/WMS-IMPLEMENTATION-ROADMAP.md)
