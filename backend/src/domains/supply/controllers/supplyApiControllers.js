'use strict';

const { wrapController } = require('./supplyApiResponse');
const api = require('../services/supplyApiService');
const validators = require('../validators/supplyValidators');

function _notFound(res, helpers) {
  return helpers.apiError(res, 404, 'not_found');
}

function _validation(res, helpers, result) {
  return helpers.apiError(res, 400, result.error, { missing: result.missing });
}

const supplierController = {
  list: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const rows = await api.listSuppliers(companyId);
    return h.apiOk(res, { contract: 'Supplier', data: { items: rows, count: rows.length } });
  }, { contract: 'Supplier' }),

  get: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await api.getSupplier(companyId, req.params.id);
    if (!row) return _notFound(res, h);
    return h.apiOk(res, { contract: 'Supplier', data: row });
  }, { contract: 'Supplier' }),

  create: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const v = validators.validateSupplier(req.body || {});
    if (!v.valid) return _validation(res, h, v);
    const row = await api.createSupplier(companyId, req.body);
    return h.apiOk(res, { contract: 'Supplier', data: row, status: 201 });
  }, { contract: 'Supplier' })
};

const categoryController = {
  list: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const rows = await api.listCategories(companyId);
    return h.apiOk(res, { contract: 'Category', data: { items: rows, count: rows.length } });
  }, { contract: 'Category' }),

  get: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await api.getCategory(companyId, req.params.id);
    if (!row) return _notFound(res, h);
    return h.apiOk(res, { contract: 'Category', data: row });
  }, { contract: 'Category' }),

  create: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const v = validators.validateCategory(req.body || {});
    if (!v.valid) return _validation(res, h, v);
    const row = await api.createCategory(companyId, req.body);
    return h.apiOk(res, { contract: 'Category', data: row, status: 201 });
  }, { contract: 'Category' })
};

const spendCenterController = {
  list: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const rows = await api.listSpendCenters(companyId);
    return h.apiOk(res, { contract: 'SpendCenter', data: { items: rows, count: rows.length } });
  }, { contract: 'SpendCenter' }),

  get: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await api.getSpendCenter(companyId, req.params.id);
    if (!row) return _notFound(res, h);
    return h.apiOk(res, { contract: 'SpendCenter', data: row });
  }, { contract: 'SpendCenter' }),

  create: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const v = validators.validateSpendCenter(req.body || {});
    if (!v.valid) return _validation(res, h, v);
    const row = await api.createSpendCenter(companyId, req.body);
    return h.apiOk(res, { contract: 'SpendCenter', data: row, status: 201 });
  }, { contract: 'SpendCenter' })
};

const purchaseRequestController = {
  list: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const rows = await api.listPurchaseRequests(companyId);
    return h.apiOk(res, { contract: 'PurchaseRequest', data: { items: rows, count: rows.length } });
  }, { contract: 'PurchaseRequest' }),

  get: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await api.getPurchaseRequest(companyId, req.params.id);
    if (!row) return _notFound(res, h);
    return h.apiOk(res, { contract: 'PurchaseRequest', data: row });
  }, { contract: 'PurchaseRequest' }),

  create: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const v = validators.validatePurchaseRequest(req.body || {});
    if (!v.valid) return _validation(res, h, v);
    const row = await api.createPurchaseRequest(companyId, req.body);
    return h.apiOk(res, { contract: 'PurchaseRequest', data: row, status: 201 });
  }, { contract: 'PurchaseRequest' }),

  submit: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await api.submitPurchaseRequest(companyId, req.params.id);
    if (!row) return _notFound(res, h);
    return h.apiOk(res, { contract: 'PurchaseRequest', data: row });
  }, { contract: 'PurchaseRequest' }),

  approve: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await api.approvePurchaseRequest(companyId, req.params.id);
    if (!row) return _notFound(res, h);
    return h.apiOk(res, { contract: 'PurchaseRequest', data: row });
  }, { contract: 'PurchaseRequest' })
};

const purchaseOrderController = {
  list: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const rows = await api.listPurchaseOrders(companyId);
    return h.apiOk(res, { contract: 'PurchaseOrder', data: { items: rows, count: rows.length } });
  }, { contract: 'PurchaseOrder' }),

  get: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await api.getPurchaseOrder(companyId, req.params.id);
    if (!row) return _notFound(res, h);
    return h.apiOk(res, { contract: 'PurchaseOrder', data: row });
  }, { contract: 'PurchaseOrder' }),

  create: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const v = validators.validatePurchaseOrder(req.body || {});
    if (!v.valid) return _validation(res, h, v);
    const row = await api.createPurchaseOrder(companyId, req.body);
    return h.apiOk(res, { contract: 'PurchaseOrder', data: row, status: 201 });
  }, { contract: 'PurchaseOrder' })
};

const quotationController = {
  list: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const rows = await api.listQuotations(companyId);
    return h.apiOk(res, { contract: 'Quotation', data: { items: rows, count: rows.length } });
  }, { contract: 'Quotation' }),

  get: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await api.getQuotation(companyId, req.params.id);
    if (!row) return _notFound(res, h);
    return h.apiOk(res, { contract: 'Quotation', data: row });
  }, { contract: 'Quotation' }),

  create: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const v = validators.validateQuotation(req.body || {});
    if (!v.valid) return _validation(res, h, v);
    const row = await api.createQuotation(companyId, req.body);
    return h.apiOk(res, { contract: 'Quotation', data: row, status: 201 });
  }, { contract: 'Quotation' })
};

const contractController = {
  list: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const rows = await api.listContracts(companyId);
    return h.apiOk(res, { contract: 'Contract', data: { items: rows, count: rows.length } });
  }, { contract: 'Contract' }),

  get: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await api.getContract(companyId, req.params.id);
    if (!row) return _notFound(res, h);
    return h.apiOk(res, { contract: 'Contract', data: row });
  }, { contract: 'Contract' }),

  create: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const v = validators.validateContract(req.body || {});
    if (!v.valid) return _validation(res, h, v);
    const row = await api.createContract(companyId, req.body);
    return h.apiOk(res, { contract: 'Contract', data: row, status: 201 });
  }, { contract: 'Contract' })
};

const approvalController = {
  list: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const rows = await api.listApprovals(companyId);
    return h.apiOk(res, { contract: 'Approval', data: { items: rows, count: rows.length } });
  }, { contract: 'Approval' }),

  get: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await api.getApproval(companyId, req.params.id);
    if (!row) return _notFound(res, h);
    return h.apiOk(res, { contract: 'Approval', data: row });
  }, { contract: 'Approval' }),

  create: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const v = validators.validateApproval(req.body || {});
    if (!v.valid) return _validation(res, h, v);
    const row = await api.createApproval(companyId, req.body);
    return h.apiOk(res, { contract: 'Approval', data: row, status: 201 });
  }, { contract: 'Approval' }),

  execute: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const row = await api.executeApproval(companyId, req.params.id, req.user?.id);
    if (!row) return _notFound(res, h);
    return h.apiOk(res, { contract: 'Approval', data: row });
  }, { contract: 'Approval' })
};

const pilotController = {
  integration: wrapController(async (req, res, h) => {
    const companyId = h.tenantId(req, res);
    if (!companyId) return;
    const result = await api.runPilotBridge(
      { ...req.user, company_id: companyId },
      {
        company_id: companyId,
        force_supply_pilot: req.headers['x-supply-api-test'] === '1',
        auth_token: req.headers.authorization,
        api_base_url: process.env.IMPETUS_API_BASE || null
      },
      req.body?.promotion_result || {}
    );
    return h.apiOk(res, {
      contract: 'PilotIntegration',
      data: result,
      meta: { pilot_layer: true, source: 'supply_pilot_integration_layer' }
    });
  }, { contract: 'PilotIntegration' })
};

module.exports = {
  supplierController,
  categoryController,
  spendCenterController,
  purchaseRequestController,
  purchaseOrderController,
  quotationController,
  contractController,
  approvalController,
  pilotController
};
