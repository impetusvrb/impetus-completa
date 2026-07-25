'use strict';

/**
 * WMS-002 — Core Operational Services (consomem exclusivamente OCL).
 */

const ocl = require('../compatibility/operationalCompatibilityLayer');
const wmsEventCatalog = require('../events/wmsEventCatalog');

function _contract(name, phase = 'WMS-002') {
  return { service: name, phase, status: 'operational', ready: true, consumes: 'OCL' };
}

function _emit(eventBus, type, payload, companyId) {
  if (!eventBus) return;
  const entry = wmsEventCatalog.find((e) => e.type === type);
  eventBus.emit('industrial.event', {
    type,
    domain: 'logistics-operational',
    company_id: companyId,
    critical: entry?.critical ?? false,
    payload,
    emitted_at: new Date().toISOString()
  });
}

class WarehouseOperationalService {
  getContract() { return _contract('WarehouseService'); }
  list(companyId, opts) { return ocl.warehouses.list(companyId, opts); }
  create(companyId, data, ctx = {}) {
    return ocl.warehouses.create(companyId, data).then((row) => {
      _emit(ctx.eventBus, 'wms.warehouse.created', { id: row.id }, companyId);
      return row;
    });
  }
}

class InventoryOperationalService {
  getContract() { return _contract('InventoryService'); }
  listItems(companyId, opts) { return ocl.inventory.listItems(companyId, opts); }
  listBalances(companyId, opts) { return ocl.inventory.listBalances(companyId, opts); }
  createItem(companyId, data, ctx = {}) {
    return ocl.inventory.createItem(companyId, data).then((row) => {
      _emit(ctx.eventBus, 'wms.inventory.balance_changed', { item_id: row.id }, companyId);
      return row;
    });
  }
}

class MovementOperationalService {
  getContract() { return _contract('MovementService'); }
  list(companyId, opts) { return ocl.movements.list(companyId, opts); }
  create(companyId, data, ctx = {}) {
    return ocl.movements.create(companyId, data).then((row) => {
      _emit(ctx.eventBus, 'wms.movement.posted', { id: row.id, movement_type: data.movement_type }, companyId);
      return row;
    });
  }
}

class ReceivingOperationalService {
  getContract() { return _contract('ReceivingService'); }
  list(companyId, opts) { return ocl.receiving.list(companyId, opts); }
  createOrder(companyId, data, ctx = {}) {
    return ocl.receiving.createOrder(companyId, data).then((row) => {
      _emit(ctx.eventBus, 'wms.receiving.order_created', { id: row.id }, companyId);
      return row;
    });
  }
}

class PickingOperationalService {
  getContract() { return _contract('PickingService'); }
  list(companyId, opts) { return ocl.picking.list(companyId, opts); }
  createOrder(companyId, data, ctx = {}) {
    return ocl.picking.createOrder(companyId, data).then((row) => {
      _emit(ctx.eventBus, 'wms.picking.order_created', { id: row.id }, companyId);
      return row;
    });
  }
}

class ShippingOperationalService {
  getContract() { return _contract('ShippingService'); }
  list(companyId, opts) { return ocl.shipping.list(companyId, opts); }
  createOrder(companyId, data, ctx = {}) {
    return ocl.shipping.createOrder(companyId, data).then((row) => {
      _emit(ctx.eventBus, 'wms.shipping.order_created', { id: row.id }, companyId);
      return row;
    });
  }
}

class TransferOperationalService {
  getContract() { return _contract('TransferService'); }
  list(companyId, opts) { return ocl.transfers.list(companyId, opts); }
  createOrder(companyId, data, ctx = {}) {
    return ocl.transfers.createOrder(companyId, data).then((row) => {
      _emit(ctx.eventBus, 'wms.transfer.order_created', { id: row.id }, companyId);
      return row;
    });
  }
}

module.exports = {
  WarehouseOperationalService,
  InventoryOperationalService,
  MovementOperationalService,
  ReceivingOperationalService,
  PickingOperationalService,
  ShippingOperationalService,
  TransferOperationalService,
  warehouseService: new WarehouseOperationalService(),
  inventoryService: new InventoryOperationalService(),
  movementService: new MovementOperationalService(),
  receivingService: new ReceivingOperationalService(),
  pickingService: new PickingOperationalService(),
  shippingService: new ShippingOperationalService(),
  transferService: new TransferOperationalService(),
  ocl
};
