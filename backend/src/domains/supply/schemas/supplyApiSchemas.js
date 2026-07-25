'use strict';

const SUPPLIER_SCHEMA = Object.freeze({
  required: ['name'],
  fields: ['party_code', 'name', 'status', 'qualification_score']
});

const PURCHASE_REQUEST_SCHEMA = Object.freeze({
  required: ['buyer_id'],
  fields: ['request_number', 'buyer_id', 'category_id', 'items', 'budget_reference']
});

const PURCHASE_ORDER_SCHEMA = Object.freeze({
  required: ['supplier_id'],
  fields: ['order_number', 'supplier_id', 'purchase_request_id', 'lines']
});

const QUOTATION_SCHEMA = Object.freeze({
  required: ['supplier_id'],
  fields: ['quotation_number', 'supplier_id', 'purchase_request_id', 'amount', 'currency']
});

const CONTRACT_SCHEMA = Object.freeze({
  required: ['supplier_id', 'valid_from'],
  fields: ['contract_number', 'supplier_id', 'valid_from', 'valid_to', 'status']
});

const APPROVAL_SCHEMA = Object.freeze({
  required: ['subject_type', 'subject_id'],
  fields: ['subject_type', 'subject_id', 'approver_id', 'status']
});

const SPEND_CENTER_SCHEMA = Object.freeze({
  required: ['code', 'name'],
  fields: ['code', 'name', 'budget_limit', 'currency']
});

const CATEGORY_SCHEMA = Object.freeze({
  required: ['code', 'name'],
  fields: ['code', 'name', 'parent_id']
});

module.exports = {
  SUPPLIER_SCHEMA,
  PURCHASE_REQUEST_SCHEMA,
  PURCHASE_ORDER_SCHEMA,
  QUOTATION_SCHEMA,
  CONTRACT_SCHEMA,
  APPROVAL_SCHEMA,
  SPEND_CENTER_SCHEMA,
  CATEGORY_SCHEMA
};
