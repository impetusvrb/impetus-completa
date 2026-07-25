'use strict';

const express = require('express');
const router = express.Router();
const { requireWmsApiEnabled, requireInventoryApi } = require('../middleware/wmsApiGate');
const { requireWmsPermission } = require('../shared/wmsRbacDefinitions');
const controllers = require('../controllers/wmsOperationalApiControllers');
const { getWmsApiObservabilitySnapshot } = require('../shared/wmsApiObservability');

router.use(requireWmsApiEnabled);

router.get('/meta', (req, res) => {
  res.json({
    ok: true,
    phase: 'WMS-003',
    version: 'v1',
    domain: 'logistics-operational',
    ocl_required: true,
    menu_published: false
  });
});

router.get('/observability', (req, res) => {
  res.json({ ok: true, phase: 'WMS-003', entries: getWmsApiObservabilitySnapshot(100) });
});

const inv = controllers.inventoryController;
router.get('/inventory/items', requireInventoryApi, requireWmsPermission('inventory.read'), inv.listItems);
router.get('/inventory/balances', requireInventoryApi, requireWmsPermission('inventory.read'), inv.listBalances);
router.get('/inventory/items/:id', requireInventoryApi, requireWmsPermission('inventory.read'), inv.getItem);
router.post('/inventory/items', requireInventoryApi, requireWmsPermission('inventory.write'), express.json(), inv.createItem);
router.get('/inventory/movements', requireInventoryApi, requireWmsPermission('inventory.read'), inv.listMovements);
router.post('/inventory/movements', requireInventoryApi, requireWmsPermission('inventory.write'), express.json(), inv.createMovement);
router.get('/inventory/movements/:id', requireInventoryApi, requireWmsPermission('inventory.read'), inv.getMovement);

const wh = controllers.warehouseController;
router.get('/warehouses', requireWmsPermission('warehouse.read'), wh.list);
router.post('/warehouses', requireWmsPermission('warehouse.write'), express.json(), wh.create);
router.get('/warehouses/:id', requireWmsPermission('warehouse.read'), wh.get);
router.get('/warehouses/:id/locations', requireWmsPermission('warehouse.read'), wh.listLocations);
router.get('/warehouses/:id/capacity', requireWmsPermission('warehouse.read'), wh.capacity);

const rcv = controllers.receivingController;
router.get('/receiving', requireWmsPermission('inventory.read'), rcv.list);
router.post('/receiving', requireWmsPermission('receiving.execute'), express.json(), rcv.create);
router.get('/receiving/:id', requireWmsPermission('inventory.read'), rcv.get);
router.patch('/receiving/:id/status', requireWmsPermission('receiving.execute'), express.json(), rcv.updateStatus);

const pick = controllers.pickingController;
router.get('/picking', requireWmsPermission('inventory.read'), pick.list);
router.post('/picking', requireWmsPermission('picking.execute'), express.json(), pick.create);
router.get('/picking/:id', requireWmsPermission('inventory.read'), pick.get);
router.post('/picking/:id/execute', requireWmsPermission('picking.execute'), pick.execute);
router.post('/picking/:id/complete', requireWmsPermission('picking.execute'), pick.complete);

const ship = controllers.shippingController;
router.get('/shipping', requireWmsPermission('inventory.read'), ship.list);
router.post('/shipping', requireWmsPermission('shipping.execute'), express.json(), ship.create);
router.get('/shipping/:id', requireWmsPermission('inventory.read'), ship.get);
router.post('/shipping/:id/dispatch', requireWmsPermission('shipping.execute'), ship.dispatch);

const xfer = controllers.transferController;
router.get('/transfers', requireWmsPermission('inventory.read'), xfer.list);
router.post('/transfers', requireWmsPermission('transfer.execute'), express.json(), xfer.create);
router.get('/transfers/:id', requireWmsPermission('inventory.read'), xfer.get);
router.post('/transfers/:id/complete', requireWmsPermission('transfer.execute'), xfer.complete);

module.exports = router;
