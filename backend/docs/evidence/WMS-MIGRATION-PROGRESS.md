# WMS — Progresso de Migração (warehouse_* → wms_*)

**Programa:** WMS-002  
**Data:** 2026-07-17  
**Endpoint métricas:** `GET /api/logistics-operational/migration/stats`

---

## Resumo executivo

| Métrica | Valor (WMS-002) |
|---------|-----------------|
| **Fase actual** | OCL + Core Services |
| **Entidades híbridas** | Warehouse, WarehouseLocation, StorageAddress, InventoryItem, InventoryBalance |
| **Entidades nativas wms_*** | InventoryMovement, ReceivingOrder, PickingOrder, ShippingOrder, TransferOrder |
| **Percentual migração items** | Calculado em runtime: `wms_items / (legacy_materials + wms_items)` |
| **Descontinuados** | 0 (WMS-002) |

---

## Estado por componente legado

| Componente | Estado WMS-002 | Notas |
|------------|:--------------:|-------|
| `warehouse_materials` | **Em migração** | Leitura via Legacy Adapter; escrita canónica em `wms_inventory_items` |
| `warehouse_balances` | **Em migração** | Merge híbrido em OCL `listBalances` |
| `warehouse_locations` | **Em migração** | Leitura adapter; destino `wms_warehouse_locations` |
| `warehouse_movements` | **Substituído** (novos writes) | Novos movimentos só `wms_inventory_movements` |
| `warehouseService.js` | **Reaproveitado** (legado admin) | Core Services não importam |
| `routes/admin/warehouse.js` | **Reaproveitado** | Coexistência até WMS-004 |
| `logisticsFoundationService.js` | **Reaproveitado** | Bridge M1.2 read-only |
| `logisticsBlockBridge.js` | **Reaproveitado** | Cognitive LOCKED — intacto |
| Receiving / Picking / Shipping / Transfer (legado) | **N/A** | Só existem em `wms_*` |

---

## Percentual de migração (metodologia)

```
migration_percent_wms_items = round( wms_items / (legacy_materials + wms_items) * 100, 1 )
```

- **Migrado:** registo existe em `wms_*` com paridade funcional
- **Em migração:** leitura híbrida OCL; writes canónicos wms
- **Reaproveitado:** permanece activo fora do Core Services path
- **Substituído:** novo SSOT wms_* assume operação
- **Descontinuado:** removido ou bloqueado (nenhum em WMS-002)

---

## Próxima fase (WMS-003)

- APIs operacionais completas sobre contratos unificados
- Paridade FE `LogisticsOperationalWorkspace`
- Redução progressiva de dependência híbrida

---

*Inventário detalhado:* [WMS-LEGACY-WAREHOUSE-INVENTORY.md](./WMS-LEGACY-WAREHOUSE-INVENTORY.md)
