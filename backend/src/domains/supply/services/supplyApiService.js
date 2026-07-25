'use strict';

const store = require('../repositories/supplyInMemoryStore');
const domainServices = require('../services');
const { withSupplyMeta } = require('../contracts/canonicalContracts');
const { runSupplyPilotIntegration } = require('../pilot/supplyPilotIntegrationLayer');

function _meta(entity) {
  return withSupplyMeta(entity, 'supply_api');
}

async function listSuppliers(companyId) {
  return store.listEntities(companyId, 'suppliers').map(_meta);
}

async function getSupplier(companyId, id) {
  const row = store.getEntity(companyId, 'suppliers', id);
  return row ? _meta(row) : null;
}

async function createSupplier(companyId, body) {
  return _meta(store.createSupplier(companyId, body));
}

async function listCategories(companyId) {
  return store.listEntities(companyId, 'categories').map(_meta);
}

async function createCategory(companyId, body) {
  return _meta(store.createCategory(companyId, body));
}

async function getCategory(companyId, id) {
  const row = store.getEntity(companyId, 'categories', id);
  return row ? _meta(row) : null;
}

async function listSpendCenters(companyId) {
  return store.listEntities(companyId, 'spendCenters').map(_meta);
}

async function createSpendCenter(companyId, body) {
  return _meta(store.createSpendCenter(companyId, body));
}

async function getSpendCenter(companyId, id) {
  const row = store.getEntity(companyId, 'spendCenters', id);
  return row ? _meta(row) : null;
}

async function listPurchaseRequests(companyId) {
  return store.listEntities(companyId, 'purchaseRequests').map(_meta);
}

async function getPurchaseRequest(companyId, id) {
  const row = store.getEntity(companyId, 'purchaseRequests', id);
  return row ? _meta(row) : null;
}

async function createPurchaseRequest(companyId, body) {
  const aggregate = domainServices.purchaseRequestService.createDraft({
    buyerId: body.buyer_id,
    categoryId: body.category_id,
    items: body.items || [],
    budgetReference: body.budget_reference,
    companyId
  });
  return _meta(store.createPurchaseRequestRecord(companyId, aggregate));
}

async function submitPurchaseRequest(companyId, id) {
  const row = store.getEntity(companyId, 'purchaseRequests', id);
  if (!row) return null;
  const aggregate = domainServices.purchaseRequestService.createDraft({
    id: row.id,
    requestNumber: row.request_number,
    buyerId: row.buyer_id,
    categoryId: row.category_id,
    items: row.items,
    status: row.status,
    companyId
  });
  const { aggregate: submitted } = domainServices.purchaseRequestService.submit(aggregate);
  return _meta(store.createPurchaseRequestRecord(companyId, submitted));
}

async function approvePurchaseRequest(companyId, id) {
  const row = store.getEntity(companyId, 'purchaseRequests', id);
  if (!row) return null;
  const aggregate = domainServices.purchaseRequestService.createDraft({
    id: row.id,
    requestNumber: row.request_number,
    buyerId: row.buyer_id,
    categoryId: row.category_id,
    items: row.items,
    status: row.status,
    companyId
  });
  const { aggregate: approved } = domainServices.purchaseRequestService.approve(aggregate);
  return _meta(store.createPurchaseRequestRecord(companyId, approved));
}

async function listPurchaseOrders(companyId) {
  return store.listEntities(companyId, 'purchaseOrders').map(_meta);
}

async function getPurchaseOrder(companyId, id) {
  const row = store.getEntity(companyId, 'purchaseOrders', id);
  return row ? _meta(row) : null;
}

async function createPurchaseOrder(companyId, body) {
  return _meta(store.createPurchaseOrder(companyId, body));
}

async function listQuotations(companyId) {
  return store.listEntities(companyId, 'quotations').map(_meta);
}

async function getQuotation(companyId, id) {
  const row = store.getEntity(companyId, 'quotations', id);
  return row ? _meta(row) : null;
}

async function createQuotation(companyId, body) {
  return _meta(store.createQuotation(companyId, body));
}

async function listContracts(companyId) {
  return store.listEntities(companyId, 'contracts').map(_meta);
}

async function getContract(companyId, id) {
  const row = store.getEntity(companyId, 'contracts', id);
  return row ? _meta(row) : null;
}

async function createContract(companyId, body) {
  return _meta(store.createContract(companyId, body));
}

async function listApprovals(companyId) {
  return store.listEntities(companyId, 'approvals').map(_meta);
}

async function getApproval(companyId, id) {
  const row = store.getEntity(companyId, 'approvals', id);
  return row ? _meta(row) : null;
}

async function createApproval(companyId, body) {
  return _meta(store.createApproval(companyId, body));
}

async function executeApproval(companyId, id, approverId) {
  const updated = store.updateEntity(companyId, 'approvals', id, {
    status: 'approved',
    approver_id: approverId,
    approved_at: new Date().toISOString()
  });
  return updated ? _meta(updated) : null;
}

async function runPilotBridge(user, ctx = {}, promotionResult = {}) {
  return runSupplyPilotIntegration(user, ctx, promotionResult);
}

module.exports = {
  listSuppliers,
  getSupplier,
  createSupplier,
  listCategories,
  createCategory,
  getCategory,
  listSpendCenters,
  createSpendCenter,
  getSpendCenter,
  listPurchaseRequests,
  getPurchaseRequest,
  createPurchaseRequest,
  submitPurchaseRequest,
  approvePurchaseRequest,
  listPurchaseOrders,
  getPurchaseOrder,
  createPurchaseOrder,
  listQuotations,
  getQuotation,
  createQuotation,
  listContracts,
  getContract,
  createContract,
  listApprovals,
  getApproval,
  createApproval,
  executeApproval,
  runPilotBridge
};
