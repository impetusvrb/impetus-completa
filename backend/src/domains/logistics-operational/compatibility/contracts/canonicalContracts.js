'use strict';

/**
 * WMS-002 — Contratos canónicos estáveis (independentes da origem legacy | wms).
 */

function withMeta(entity, source, strategy) {
  return {
    ...entity,
    _source: source,
    _routing: strategy
  };
}

module.exports = {
  withMeta,
  ENTITY_TYPES: Object.freeze([
    'Warehouse',
    'WarehouseLocation',
    'StorageAddress',
    'InventoryItem',
    'InventoryBalance',
    'InventoryMovement',
    'ReceivingOrder',
    'PickingOrder',
    'ShippingOrder',
    'TransferOrder'
  ])
};
