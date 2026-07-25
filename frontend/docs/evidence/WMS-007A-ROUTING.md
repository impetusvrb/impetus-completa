# WMS-007A — Workspace Decoupling & Standalone Module Navigation

**Programa:** IMPETUS WMS  
**Tipo:** Corrective (Frontend Only)  
**Data:** 2026-07-18  
**Parecer:** COMPLETED

---

## Rotas canónicas

| Rota | Página |
| --- | --- |
| `/app/logistics/warehouses` | WarehouseModulePage |
| `/app/logistics/inventory` | InventoryModulePage |
| `/app/logistics/receiving` | ReceivingModulePage |
| `/app/logistics/picking` | PickingModulePage |
| `/app/logistics/shipping` | ShippingModulePage |
| `/app/logistics/transfers` | TransferModulePage |

## Legacy (redirect)

`/app/logistics-operational/workspace/*` → landing CC ou redirect transparente.
