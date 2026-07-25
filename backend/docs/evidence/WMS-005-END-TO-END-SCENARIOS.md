# WMS-005 — End-to-End Scenarios

**Data:** 2026-07-18

---

| Cenário | Resultado | Duração (ms) | Notas |
| --- | --- | --- | --- |
| procurement_receiving | PASS | 15 | Supply PO + WMS receiving via OCL; pilot bridge validated |
| inventory_picking | PASS | 11 | OCL picking execute→complete |
| inventory_shipping | PASS | 6 | shipping dispatch |
| warehouse_transfer | PASS | 7 | transfer A→B |
| cognitive_integrated | PASS | 2 | promotion→pilot→contracts chain |

---

## Fluxos validados

### Procurement → Receiving

`Supplier → PurchaseRequest → PurchaseOrder → ReceivingOrder → InventoryItem`

### Inventory → Picking

`InventoryItem → InventoryBalance → PickingOrder → PickingExecution → PickingComplete`

### Inventory → Shipping

`InventoryItem → ShippingOrder → ShippingDispatch`

### Transfer Warehouse A → B

`Warehouse → TransferOrder → TransferComplete`

### Cognitive Flow Integrated

`SemanticSignal → PromotionRuntime → PilotIntegrationLayer → CanonicalContracts → WmsPublicApis → OperationalWorkspace`

