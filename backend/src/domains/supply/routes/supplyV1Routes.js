'use strict';

const express = require('express');
const router = express.Router();
const { requireSupplyApiEnabled } = require('../middleware/supplyApiGate');
const { requireSupplyPermission } = require('../shared/supplyRbacDefinitions');
const controllers = require('../controllers/supplyApiControllers');
const { getSupplyApiObservabilitySnapshot } = require('../shared/supplyApiObservability');
const { listContractTypes, CONTRACT_VERSION } = require('../contracts/interfaces');

router.use(requireSupplyApiEnabled);

router.get('/meta', (req, res) => {
  res.json({
    ok: true,
    phase: 'GF-027',
    version: 'v1',
    domain: 'supply',
    contract_version: CONTRACT_VERSION,
    contracts: listContractTypes(),
    pilot_layer_required: true,
    menu_published: false
  });
});

router.get('/observability', (req, res) => {
  res.json({ ok: true, phase: 'GF-027', entries: getSupplyApiObservabilitySnapshot(100) });
});

router.get('/contracts', (req, res) => {
  res.json({
    ok: true,
    phase: 'GF-027',
    version: CONTRACT_VERSION,
    types: listContractTypes()
  });
});

const sup = controllers.supplierController;
router.get('/suppliers', requireSupplyPermission('supply.read'), sup.list);
router.post('/suppliers', requireSupplyPermission('supplier.manage'), express.json(), sup.create);
router.get('/suppliers/:id', requireSupplyPermission('supply.read'), sup.get);

const cat = controllers.categoryController;
router.get('/categories', requireSupplyPermission('supply.read'), cat.list);
router.post('/categories', requireSupplyPermission('supply.write'), express.json(), cat.create);
router.get('/categories/:id', requireSupplyPermission('supply.read'), cat.get);

const sc = controllers.spendCenterController;
router.get('/spend-centers', requireSupplyPermission('supply.read'), sc.list);
router.post('/spend-centers', requireSupplyPermission('supply.write'), express.json(), sc.create);
router.get('/spend-centers/:id', requireSupplyPermission('supply.read'), sc.get);

const pr = controllers.purchaseRequestController;
router.get('/purchase-requests', requireSupplyPermission('supply.read'), pr.list);
router.post('/purchase-requests', requireSupplyPermission('purchase.request'), express.json(), pr.create);
router.get('/purchase-requests/:id', requireSupplyPermission('supply.read'), pr.get);
router.post('/purchase-requests/:id/submit', requireSupplyPermission('purchase.request'), pr.submit);
router.post('/purchase-requests/:id/approve', requireSupplyPermission('approval.execute'), pr.approve);

const po = controllers.purchaseOrderController;
router.get('/purchase-orders', requireSupplyPermission('supply.read'), po.list);
router.post('/purchase-orders', requireSupplyPermission('purchase.order'), express.json(), po.create);
router.get('/purchase-orders/:id', requireSupplyPermission('supply.read'), po.get);

const qt = controllers.quotationController;
router.get('/quotations', requireSupplyPermission('supply.read'), qt.list);
router.post('/quotations', requireSupplyPermission('quotation.manage'), express.json(), qt.create);
router.get('/quotations/:id', requireSupplyPermission('supply.read'), qt.get);

const ct = controllers.contractController;
router.get('/contracts', requireSupplyPermission('supply.read'), ct.list);
router.post('/contracts', requireSupplyPermission('contract.manage'), express.json(), ct.create);
router.get('/contracts/:id', requireSupplyPermission('supply.read'), ct.get);

const ap = controllers.approvalController;
router.get('/approvals', requireSupplyPermission('supply.read'), ap.list);
router.post('/approvals', requireSupplyPermission('approval.execute'), express.json(), ap.create);
router.get('/approvals/:id', requireSupplyPermission('supply.read'), ap.get);
router.post('/approvals/:id/execute', requireSupplyPermission('approval.execute'), ap.execute);

const pilot = controllers.pilotController;
router.post('/pilot/integration', requireSupplyPermission('supply.read'), express.json(), pilot.integration);

module.exports = router;
