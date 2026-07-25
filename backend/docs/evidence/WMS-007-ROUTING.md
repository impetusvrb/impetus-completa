# WMS-007 — Modular Workspace Navigation

**Programa:** IMPETUS WMS  
**Tipo:** Workspace Evolution (Presentation + Workspace only)  
**Data:** 2026-07-18  
**Branch:** feature/wms-007-modular-navigation  
**Parecer:** READY

---

## Rotas

| Rota | Componente |
| --- | --- |
| `/app/logistics-operational/workspace` | WmsOperationalDashboardPage (landing) |
| `/app/logistics-operational/workspace/warehouses` | WarehouseModule |
| `/app/logistics-operational/workspace/inventory` | InventoryModule |
| `/app/logistics-operational/workspace/receiving` | ReceivingModule |
| `/app/logistics-operational/workspace/picking` | PickingModule |
| `/app/logistics-operational/workspace/shipping` | ShippingModule |
| `/app/logistics-operational/workspace/transfers` | TransferModule |

## Proibições validadas

- Sem fallback para Dashboard em rotas operacionais
- Sem `WmsOperationalModulePage` genérico no layout
- Sem `moduleId=` no routing
