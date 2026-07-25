'use strict';

const schemas = require('../schemas/supplyApiSchemas');

function _validate(schema, body = {}) {
  const missing = (schema.required || []).filter((f) => body[f] == null || body[f] === '');
  if (missing.length) {
    return { valid: false, error: 'validation_failed', missing };
  }
  return { valid: true };
}

function validateSupplier(body) {
  return _validate(schemas.SUPPLIER_SCHEMA, body);
}

function validatePurchaseRequest(body) {
  return _validate(schemas.PURCHASE_REQUEST_SCHEMA, body);
}

function validatePurchaseOrder(body) {
  return _validate(schemas.PURCHASE_ORDER_SCHEMA, body);
}

function validateQuotation(body) {
  return _validate(schemas.QUOTATION_SCHEMA, body);
}

function validateContract(body) {
  return _validate(schemas.CONTRACT_SCHEMA, body);
}

function validateApproval(body) {
  return _validate(schemas.APPROVAL_SCHEMA, body);
}

function validateSpendCenter(body) {
  return _validate(schemas.SPEND_CENTER_SCHEMA, body);
}

function validateCategory(body) {
  return _validate(schemas.CATEGORY_SCHEMA, body);
}

module.exports = {
  validateSupplier,
  validatePurchaseRequest,
  validatePurchaseOrder,
  validateQuotation,
  validateContract,
  validateApproval,
  validateSpendCenter,
  validateCategory
};
