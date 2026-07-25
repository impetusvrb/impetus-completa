# GF-026 — Canonical Contracts (Pilot)

**Versão:** `0.3.0`  
**Compatível WMS:** WMS-003 (`0.3.0`)

---

## Entidades (10)

Warehouse · WarehouseLocation · StorageAddress · InventoryItem · InventoryBalance · InventoryMovement · ReceivingOrder · PickingOrder · ShippingOrder · TransferOrder

---

## Bridge endpoints

| Key | Contract | Path |
|-----|----------|------|
| inventory_items | InventoryItem | `/v1/inventory/items` |
| inventory_balances | InventoryBalance | `/v1/inventory/balances` |
| warehouses | Warehouse | `/v1/warehouses` |
| receiving | ReceivingOrder | `/v1/receiving` |

**Producer:** `WMS_PUBLIC_API` · **Consumer:** `SUPPLY_PILOT`

---

## Evolução

Estratégia: `semver_minor_compatible`  
Breaking: INC + pilot registry bump

*Teste:* `npm run test:pilot-contracts`
