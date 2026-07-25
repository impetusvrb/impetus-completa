'use strict';

/**
 * WMS-001 — SSOT entity registry (logistics-operational bounded context).
 * Sem regras de negócio — apenas metadados de entidades e tabelas.
 */

const WMS_ENTITIES = Object.freeze({
  Warehouse: { table: 'wms_warehouses', pk: 'id' },
  WarehouseLocation: { table: 'wms_warehouse_locations', pk: 'id' },
  StorageAddress: { table: 'wms_storage_addresses', pk: 'id' },
  InventoryItem: { table: 'wms_inventory_items', pk: 'id' },
  InventoryBalance: { table: 'wms_inventory_balances', pk: 'id' },
  InventoryMovement: { table: 'wms_inventory_movements', pk: 'id' },
  PickingOrder: { table: 'wms_picking_orders', pk: 'id' },
  ReceivingOrder: { table: 'wms_receiving_orders', pk: 'id' },
  ShippingOrder: { table: 'wms_shipping_orders', pk: 'id' },
  TransferOrder: { table: 'wms_transfer_orders', pk: 'id' },
  Container: { table: 'wms_containers', pk: 'id' },
  HandlingUnit: { table: 'wms_handling_units', pk: 'id' }
});

const WMS_TABLE_NAMES = Object.freeze(Object.values(WMS_ENTITIES).map((e) => e.table));

module.exports = {
  WMS_ENTITIES,
  WMS_TABLE_NAMES,
  DOMAIN_ID: 'logistics-operational',
  PROGRAM: 'WMS-001'
};
