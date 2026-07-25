'use strict';

const crypto = require('crypto');

const _stores = new Map();

function _tenantStore(companyId) {
  if (!_stores.has(companyId)) {
    _stores.set(
      companyId,
      Object.freeze({
        suppliers: new Map(),
        purchaseRequests: new Map(),
        purchaseOrders: new Map(),
        quotations: new Map(),
        contracts: new Map(),
        approvals: new Map(),
        spendCenters: new Map(),
        categories: new Map()
      })
    );
  }
  return _stores.get(companyId);
}

function _id() {
  return crypto.randomUUID();
}

function _num(prefix, seq) {
  return `${prefix}-${String(seq).padStart(6, '0')}`;
}

function listEntities(companyId, bucket) {
  return [..._tenantStore(companyId)[bucket].values()];
}

function getEntity(companyId, bucket, id) {
  return _tenantStore(companyId)[bucket].get(id) || null;
}

function putEntity(companyId, bucket, entity) {
  _tenantStore(companyId)[bucket].set(entity.id, Object.freeze({ ...entity }));
  return entity;
}

function createSupplier(companyId, input = {}) {
  const store = _tenantStore(companyId);
  const seq = store.suppliers.size + 1;
  const entity = Object.freeze({
    id: _id(),
    type: 'Supplier',
    party_code: input.party_code || _num('SUP', seq),
    name: input.name,
    status: input.status || 'active',
    qualification_score: input.qualification_score ?? null,
    company_id: companyId
  });
  return putEntity(companyId, 'suppliers', entity);
}

function createCategory(companyId, input = {}) {
  const store = _tenantStore(companyId);
  const seq = store.categories.size + 1;
  const entity = Object.freeze({
    id: _id(),
    type: 'Category',
    code: input.code || _num('CAT', seq),
    name: input.name,
    parent_id: input.parent_id || null,
    company_id: companyId
  });
  return putEntity(companyId, 'categories', entity);
}

function createSpendCenter(companyId, input = {}) {
  const store = _tenantStore(companyId);
  const seq = store.spendCenters.size + 1;
  const entity = Object.freeze({
    id: _id(),
    type: 'SpendCenter',
    code: input.code || _num('SC', seq),
    name: input.name,
    budget_limit: input.budget_limit ?? null,
    currency: input.currency || 'BRL',
    company_id: companyId
  });
  return putEntity(companyId, 'spendCenters', entity);
}

function createPurchaseRequestRecord(companyId, aggregate = {}) {
  const store = _tenantStore(companyId);
  const seq = store.purchaseRequests.size + 1;
  const entity = Object.freeze({
    id: aggregate.id || _id(),
    type: 'PurchaseRequest',
    request_number: aggregate.requestNumber || _num('PR', seq),
    buyer_id: aggregate.buyerId,
    category_id: aggregate.categoryId || null,
    status: aggregate.status,
    items: aggregate.items || [],
    total_amount: aggregate.totalAmount || null,
    company_id: companyId
  });
  return putEntity(companyId, 'purchaseRequests', entity);
}

function createPurchaseOrder(companyId, input = {}) {
  const store = _tenantStore(companyId);
  const seq = store.purchaseOrders.size + 1;
  const entity = Object.freeze({
    id: _id(),
    type: 'PurchaseOrder',
    order_number: input.order_number || _num('PO', seq),
    supplier_id: input.supplier_id,
    purchase_request_id: input.purchase_request_id || null,
    status: input.status || 'draft',
    lines: input.lines || [],
    company_id: companyId
  });
  return putEntity(companyId, 'purchaseOrders', entity);
}

function createQuotation(companyId, input = {}) {
  const store = _tenantStore(companyId);
  const seq = store.quotations.size + 1;
  const entity = Object.freeze({
    id: _id(),
    type: 'Quotation',
    quotation_number: input.quotation_number || _num('QT', seq),
    supplier_id: input.supplier_id,
    purchase_request_id: input.purchase_request_id || null,
    status: input.status || 'received',
    amount: input.amount ?? null,
    currency: input.currency || 'BRL',
    company_id: companyId
  });
  return putEntity(companyId, 'quotations', entity);
}

function createContract(companyId, input = {}) {
  const store = _tenantStore(companyId);
  const seq = store.contracts.size + 1;
  const entity = Object.freeze({
    id: _id(),
    type: 'Contract',
    contract_number: input.contract_number || _num('CT', seq),
    supplier_id: input.supplier_id,
    valid_from: input.valid_from,
    valid_to: input.valid_to || null,
    status: input.status || 'draft',
    company_id: companyId
  });
  return putEntity(companyId, 'contracts', entity);
}

function createApproval(companyId, input = {}) {
  const store = _tenantStore(companyId);
  const entity = Object.freeze({
    id: _id(),
    type: 'Approval',
    subject_type: input.subject_type,
    subject_id: input.subject_id,
    approver_id: input.approver_id || null,
    status: input.status || 'pending',
    company_id: companyId
  });
  return putEntity(companyId, 'approvals', entity);
}

function updateEntity(companyId, bucket, id, patch) {
  const existing = getEntity(companyId, bucket, id);
  if (!existing) return null;
  return putEntity(companyId, bucket, { ...existing, ...patch });
}

function resetSupplyStoreForTests() {
  _stores.clear();
}

module.exports = {
  listEntities,
  getEntity,
  createSupplier,
  createCategory,
  createSpendCenter,
  createPurchaseRequestRecord,
  createPurchaseOrder,
  createQuotation,
  createContract,
  createApproval,
  updateEntity,
  resetSupplyStoreForTests
};
