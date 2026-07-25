# WMS-005 — Pilot Validation Matrix

**Gerado:** 2026-07-18T17:58:18.944Z

---

| Cenário | Componentes | Contratos | APIs | Flags | RBAC | Resultado | Observações |
| --- | --- | --- | --- | --- | --- | --- | --- |
| procurement_receiving | supply_api, pilot_layer, wms_ocl, canonical_contracts | Supplier, PurchaseRequest, PurchaseOrder, ReceivingOrder | POST /supply/v1/purchase-requests, POST /supply/v1/purchase-orders, GET /logistics-operational/v1/receiving | {"pilot_forced":true} | purchase.request, purchase.order, receiving.execute | PASS | Supply PO + WMS receiving via OCL; pilot bridge validated |
| inventory_picking | wms_ocl, wms_api | InventoryItem, PickingOrder | GET /v1/inventory/items, POST /v1/picking, POST /v1/picking/:id/execute, POST /v1/picking/:id/complete | {"wms_api":"test_mode"} | inventory.read, picking.execute | PASS | OCL picking execute→complete |
| inventory_shipping | wms_ocl, wms_api | InventoryItem, ShippingOrder | GET /v1/inventory/items, POST /v1/shipping, POST /v1/shipping/:id/dispatch | {} | inventory.read, shipping.execute | PASS | shipping dispatch |
| warehouse_transfer | wms_ocl, wms_api | Warehouse, TransferOrder | POST /v1/transfers, POST /v1/transfers/:id/complete | {} | warehouse.read, transfer.execute | PASS | transfer A→B |
| cognitive_integrated | supply_promotion, pilot_layer, inc048_convergence, wms_workspace_fe, supply_workspace_fe | PILOT_CONTRACT_v0.3.0, SUPPLY_CONTRACT_v0.2.0 | pilot/integration, inc048/validate | {"inc048":"validated_via_cross_domain"} | supply.read, warehouse.read | PASS | promotion→pilot→contracts chain |

**Matriz completa:** ALL PASS
