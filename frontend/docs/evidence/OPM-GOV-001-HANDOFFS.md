# OPM-GOV-001 — Handoff Contracts

## Cadeia certificada

```
ReceivingCompleted → InventoryReceiptCreated
        ↓
InventoryAvailable → PickingReleased
        ↓
PickingCompleted → ShippingReady
        ↓
ShippingDispatched → InventoryIssueCreated
```

## Detalhe

| ID | De | Para | Movimento |
|----|-----|------|-----------|
| handoff-receiving-inventory | Receiving OPM-003 | Inventory OPM-002A | receipt |
| handoff-inventory-picking | Inventory OPM-002A | Picking OPM-004 | — |
| handoff-picking-shipping | Picking OPM-004 | Shipping OPM-005 | — |
| handoff-shipping-inventory | Shipping OPM-005 | Inventory OPM-002A | issue |

Todos com `status: active` e validados em OPM-E2E-001.
