'use strict';

/**
 * WMS-003 — Controllers operacionais (OCL exclusivo · sem regras de negócio).
 */

const ocl = require('../compatibility/operationalCompatibilityLayer');
const validators = require('../validators/wmsValidators');
const { wrapController } = require('./wmsApiResponse');

const inventoryController = {
  listItems: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const result = await ocl.inventory.listItems(companyId, { limit: Number(req.query.limit) || 50 });
    h.apiOk(res, { contract: 'InventoryItem', data: result.items, meta: { routing: result.strategy } });
  }, { contract: 'InventoryItem' }),

  listBalances: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const result = await ocl.inventory.listBalances(companyId);
    h.apiOk(res, { contract: 'InventoryBalance', data: result.items, meta: { routing: result.strategy } });
  }, { contract: 'InventoryBalance' }),

  getItem: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await ocl.inventoryApi.getItemById(companyId, req.params.id);
    if (!row) return h.apiError(res, 404, 'not_found');
    h.apiOk(res, { contract: 'InventoryItem', data: row });
  }, { contract: 'InventoryItem' }),

  createItem: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const v = validators.validateItem({ ...req.body, company_id: companyId });
    if (!v.valid) return h.apiError(res, 400, 'validation_failed', { errors: v.errors });
    const row = await ocl.inventory.createItem(companyId, req.body);
    h.apiOk(res, { contract: 'InventoryItem', data: row, status: 201 });
  }, { contract: 'InventoryItem' }),

  listMovements: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const result = await ocl.movements.list(companyId);
    h.apiOk(res, { contract: 'InventoryMovement', data: result.items, meta: { routing: result.strategy } });
  }, { contract: 'InventoryMovement' }),

  createMovement: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const v = validators.validateMovement({ ...req.body, company_id: companyId });
    if (!v.valid) return h.apiError(res, 400, 'validation_failed', { errors: v.errors });
    const row = await ocl.movements.create(companyId, req.body);
    h.apiOk(res, { contract: 'InventoryMovement', data: row, status: 201 });
  }, { contract: 'InventoryMovement' }),

  getMovement: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await ocl.movementsApi.getById(companyId, req.params.id);
    if (!row) return h.apiError(res, 404, 'not_found');
    h.apiOk(res, { contract: 'InventoryMovement', data: row });
  }, { contract: 'InventoryMovement' })
};

const warehouseController = {
  list: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const result = await ocl.warehouses.list(companyId);
    h.apiOk(res, { contract: 'Warehouse', data: result.items, meta: { routing: result.strategy } });
  }, { contract: 'Warehouse' }),

  get: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await ocl.warehousesApi.getById(companyId, req.params.id);
    if (!row) return h.apiError(res, 404, 'not_found');
    h.apiOk(res, { contract: 'Warehouse', data: row });
  }, { contract: 'Warehouse' }),

  create: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const v = validators.validateWarehouse({ ...req.body, company_id: companyId });
    if (!v.valid) return h.apiError(res, 400, 'validation_failed', { errors: v.errors });
    const row = await ocl.warehouses.create(companyId, req.body);
    h.apiOk(res, { contract: 'Warehouse', data: row, status: 201 });
  }, { contract: 'Warehouse' }),

  listLocations: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const result = await ocl.warehousesApi.listLocations(companyId, req.params.id);
    h.apiOk(res, { contract: 'WarehouseLocation', data: result.items, meta: { routing: result.strategy } });
  }, { contract: 'WarehouseLocation' }),

  capacity: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await ocl.warehousesApi.getCapacity(companyId, req.params.id);
    if (!row) return h.apiError(res, 404, 'not_found');
    h.apiOk(res, { contract: 'Warehouse', data: row });
  }, { contract: 'Warehouse' })
};

const receivingController = {
  list: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const result = await ocl.receiving.list(companyId);
    h.apiOk(res, { contract: 'ReceivingOrder', data: result.items, meta: { routing: result.strategy } });
  }, { contract: 'ReceivingOrder' }),

  create: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const v = validators.validateOrder({ ...req.body, company_id: companyId });
    if (!v.valid) return h.apiError(res, 400, 'validation_failed', { errors: v.errors });
    const row = await ocl.receiving.createOrder(companyId, req.body);
    h.apiOk(res, { contract: 'ReceivingOrder', data: row, status: 201 });
  }, { contract: 'ReceivingOrder' }),

  get: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await ocl.receivingApi.getById(companyId, req.params.id);
    if (!row) return h.apiError(res, 404, 'not_found');
    h.apiOk(res, { contract: 'ReceivingOrder', data: row });
  }, { contract: 'ReceivingOrder' }),

  updateStatus: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const status = req.body?.status;
    if (!status) return h.apiError(res, 400, 'status required');
    const row = await ocl.receivingApi.updateStatus(companyId, req.params.id, status);
    if (!row) return h.apiError(res, 404, 'not_found');
    h.apiOk(res, { contract: 'ReceivingOrder', data: row });
  }, { contract: 'ReceivingOrder' })
};

const pickingController = {
  list: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const result = await ocl.picking.list(companyId);
    h.apiOk(res, { contract: 'PickingOrder', data: result.items, meta: { routing: result.strategy } });
  }, { contract: 'PickingOrder' }),

  create: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const v = validators.validateOrder({ ...req.body, company_id: companyId });
    if (!v.valid) return h.apiError(res, 400, 'validation_failed', { errors: v.errors });
    const row = await ocl.picking.createOrder(companyId, req.body);
    h.apiOk(res, { contract: 'PickingOrder', data: row, status: 201 });
  }, { contract: 'PickingOrder' }),

  get: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await ocl.pickingApi.getById(companyId, req.params.id);
    if (!row) return h.apiError(res, 404, 'not_found');
    h.apiOk(res, { contract: 'PickingOrder', data: row });
  }, { contract: 'PickingOrder' }),

  execute: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await ocl.pickingApi.execute(companyId, req.params.id);
    if (!row) return h.apiError(res, 404, 'not_found');
    h.apiOk(res, { contract: 'PickingOrder', data: row });
  }, { contract: 'PickingOrder' }),

  complete: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await ocl.pickingApi.complete(companyId, req.params.id);
    if (!row) return h.apiError(res, 404, 'not_found');
    h.apiOk(res, { contract: 'PickingOrder', data: row });
  }, { contract: 'PickingOrder' })
};

const shippingController = {
  list: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const result = await ocl.shipping.list(companyId);
    h.apiOk(res, { contract: 'ShippingOrder', data: result.items, meta: { routing: result.strategy } });
  }, { contract: 'ShippingOrder' }),

  create: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const v = validators.validateOrder({ ...req.body, company_id: companyId });
    if (!v.valid) return h.apiError(res, 400, 'validation_failed', { errors: v.errors });
    const row = await ocl.shipping.createOrder(companyId, req.body);
    h.apiOk(res, { contract: 'ShippingOrder', data: row, status: 201 });
  }, { contract: 'ShippingOrder' }),

  get: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await ocl.shippingApi.getById(companyId, req.params.id);
    if (!row) return h.apiError(res, 404, 'not_found');
    h.apiOk(res, { contract: 'ShippingOrder', data: row });
  }, { contract: 'ShippingOrder' }),

  dispatch: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await ocl.shippingApi.dispatch(companyId, req.params.id);
    if (!row) return h.apiError(res, 404, 'not_found');
    h.apiOk(res, { contract: 'ShippingOrder', data: row });
  }, { contract: 'ShippingOrder' })
};

const transferController = {
  list: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const result = await ocl.transfers.list(companyId);
    h.apiOk(res, { contract: 'TransferOrder', data: result.items, meta: { routing: result.strategy } });
  }, { contract: 'TransferOrder' }),

  create: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const v = validators.validateOrder({ ...req.body, company_id: companyId });
    if (!v.valid) return h.apiError(res, 400, 'validation_failed', { errors: v.errors });
    const row = await ocl.transfers.createOrder(companyId, req.body);
    h.apiOk(res, { contract: 'TransferOrder', data: row, status: 201 });
  }, { contract: 'TransferOrder' }),

  get: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await ocl.transfersApi.getById(companyId, req.params.id);
    if (!row) return h.apiError(res, 404, 'not_found');
    h.apiOk(res, { contract: 'TransferOrder', data: row });
  }, { contract: 'TransferOrder' }),

  complete: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await ocl.transfersApi.complete(companyId, req.params.id);
    if (!row) return h.apiError(res, 404, 'not_found');
    h.apiOk(res, { contract: 'TransferOrder', data: row });
  }, { contract: 'TransferOrder' })
};

module.exports = {
  inventoryController,
  warehouseController,
  receivingController,
  pickingController,
  shippingController,
  transferController
};
