'use strict';

/** DTOs foundation — transporte entre camadas (WMS-002+). */

function foundationDto(type, fields = {}) {
  return { _dto: type, phase: 'WMS-001', ...fields };
}

module.exports = {
  warehouseDto: (row) => foundationDto('Warehouse', row),
  inventoryItemDto: (row) => foundationDto('InventoryItem', row),
  movementDto: (row) => foundationDto('InventoryMovement', row),
  orderDto: (kind, row) => foundationDto(`${kind}Order`, row)
};
