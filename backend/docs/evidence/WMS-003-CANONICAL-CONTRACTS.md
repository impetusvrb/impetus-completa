# WMS-003 — Canonical Contracts

**SSOT:** `compatibility/contracts/canonicalContracts.js` (WMS-002 — **não alterado**)

---

## ENTITY_TYPES (10)

Warehouse · WarehouseLocation · StorageAddress · InventoryItem · InventoryBalance · InventoryMovement · ReceivingOrder · PickingOrder · ShippingOrder · TransferOrder

---

## Resposta API WMS-003

```json
{
  "ok": true,
  "phase": "WMS-003",
  "contract": "InventoryItem",
  "data": { "...": "...", "_source": "wms", "_routing": "wms" },
  "meta": { "routing": "wms", "source": "wms", "fallback": false }
}
```

`withMeta()` preserva origem legacy | wms | hybrid para GF-026.

*Teste:* `npm run test:canonical-contracts`
