'use strict';

/**
 * GF-023 — Semântica canónica Supply / Procure-to-Pay.
 * SSOT do domínio — sem BD, sem HTTP, sem integrações externas.
 */

const SUPPLY_ENTITY_TYPES = Object.freeze([
  'Supplier',
  'PurchaseRequest',
  'PurchaseOrder',
  'Quotation',
  'Contract',
  'Approval',
  'Category',
  'Buyer',
  'SpendCenter'
]);

const SUPPLIER_STATUS = Object.freeze({
  PROSPECT: 'PROSPECT',
  QUALIFIED: 'QUALIFIED',
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  DISQUALIFIED: 'DISQUALIFIED'
});

const PURCHASE_REQUEST_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  SUBMITTED: 'SUBMITTED',
  UNDER_APPROVAL: 'UNDER_APPROVAL',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  CANCELLED: 'CANCELLED',
  CONVERTED_TO_PO: 'CONVERTED_TO_PO'
});

const PURCHASE_ORDER_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  ISSUED: 'ISSUED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
  PARTIALLY_RECEIVED: 'PARTIALLY_RECEIVED',
  RECEIVED: 'RECEIVED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED'
});

const QUOTATION_STATUS = Object.freeze({
  REQUESTED: 'REQUESTED',
  RECEIVED: 'RECEIVED',
  UNDER_EVALUATION: 'UNDER_EVALUATION',
  SELECTED: 'SELECTED',
  REJECTED: 'REJECTED',
  EXPIRED: 'EXPIRED'
});

const CONTRACT_STATUS = Object.freeze({
  DRAFT: 'DRAFT',
  PENDING_SIGNATURE: 'PENDING_SIGNATURE',
  ACTIVE: 'ACTIVE',
  EXPIRING: 'EXPIRING',
  EXPIRED: 'EXPIRED',
  TERMINATED: 'TERMINATED'
});

const APPROVAL_STATUS = Object.freeze({
  PENDING: 'PENDING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  ESCALATED: 'ESCALATED'
});

const SPEND_CENTER_STATUS = Object.freeze({
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE'
});

const ENTITY_LIFECYCLES = Object.freeze({
  Supplier: Object.values(SUPPLIER_STATUS),
  PurchaseRequest: Object.values(PURCHASE_REQUEST_STATUS),
  PurchaseOrder: Object.values(PURCHASE_ORDER_STATUS),
  Quotation: Object.values(QUOTATION_STATUS),
  Contract: Object.values(CONTRACT_STATUS),
  Approval: Object.values(APPROVAL_STATUS),
  SpendCenter: Object.values(SPEND_CENTER_STATUS)
});

const ENTITY_INVARIANTS = Object.freeze({
  Supplier: ['party_code required', 'name required', 'QUALIFIED requires score >= threshold'],
  PurchaseRequest: ['at least one item when SUBMITTED', 'budget reference when amount > limit'],
  PurchaseOrder: ['supplier_id required when ISSUED', 'must originate from APPROVED request or quotation'],
  Quotation: ['supplier_id required', 'valid_until when RECEIVED'],
  Contract: ['supplier_id required', 'valid_from <= valid_to when ACTIVE'],
  Approval: ['subject_type and subject_id required', 'approver distinct from requester'],
  SpendCenter: ['code required', 'allocated budget >= 0']
});

function isValidStatus(entityType, status) {
  const list = ENTITY_LIFECYCLES[entityType];
  return list ? list.includes(status) : false;
}

module.exports = {
  SUPPLY_ENTITY_TYPES,
  SUPPLIER_STATUS,
  PURCHASE_REQUEST_STATUS,
  PURCHASE_ORDER_STATUS,
  QUOTATION_STATUS,
  CONTRACT_STATUS,
  APPROVAL_STATUS,
  SPEND_CENTER_STATUS,
  ENTITY_LIFECYCLES,
  ENTITY_INVARIANTS,
  isValidStatus
};
