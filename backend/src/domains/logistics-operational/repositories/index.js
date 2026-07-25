'use strict';

const db = require('../../../db');
const { createWmsRepository } = require('./baseWmsRepository');
const { WMS_ENTITIES } = require('../core/wmsEntityRegistry');

function repoFor(entityKey) {
  const meta = WMS_ENTITIES[entityKey];
  if (!meta) throw new Error(`unknown entity ${entityKey}`);
  return createWmsRepository(db, meta);
}

module.exports = {
  warehouseRepository: repoFor('Warehouse'),
  warehouseLocationRepository: repoFor('WarehouseLocation'),
  storageAddressRepository: repoFor('StorageAddress'),
  inventoryItemRepository: repoFor('InventoryItem'),
  inventoryBalanceRepository: repoFor('InventoryBalance'),
  inventoryMovementRepository: repoFor('InventoryMovement'),
  pickingOrderRepository: repoFor('PickingOrder'),
  receivingOrderRepository: repoFor('ReceivingOrder'),
  shippingOrderRepository: repoFor('ShippingOrder'),
  transferOrderRepository: repoFor('TransferOrder'),
  containerRepository: repoFor('Container'),
  handlingUnitRepository: repoFor('HandlingUnit'),
  repoFor
};
