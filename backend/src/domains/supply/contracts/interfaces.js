'use strict';

/**
 * GF-022 — Contratos canónicos (interfaces / shapes only — sem implementação).
 */

const CONTRACT_VERSION = '0.2.0';

const SupplierContract = Object.freeze({
  type: 'Supplier',
  version: CONTRACT_VERSION,
  fields: ['id', 'party_code', 'name', 'status', 'company_id'],
  ssot_phase: 'GF-023'
});

const PurchaseRequestContract = Object.freeze({
  type: 'PurchaseRequest',
  version: CONTRACT_VERSION,
  fields: ['id', 'request_number', 'requester_id', 'status', 'company_id'],
  ssot_phase: 'GF-023'
});

const PurchaseOrderContract = Object.freeze({
  type: 'PurchaseOrder',
  version: CONTRACT_VERSION,
  fields: ['id', 'order_number', 'supplier_id', 'status', 'company_id'],
  ssot_phase: 'GF-023'
});

const ContractContract = Object.freeze({
  type: 'Contract',
  version: CONTRACT_VERSION,
  fields: ['id', 'contract_number', 'supplier_id', 'valid_from', 'valid_to', 'company_id'],
  ssot_phase: 'GF-023'
});

const QuotationContract = Object.freeze({
  type: 'Quotation',
  version: CONTRACT_VERSION,
  fields: ['id', 'quotation_number', 'supplier_id', 'status', 'company_id'],
  ssot_phase: 'GF-023'
});

const ApprovalContract = Object.freeze({
  type: 'Approval',
  version: CONTRACT_VERSION,
  fields: ['id', 'subject_type', 'subject_id', 'approver_id', 'status', 'company_id'],
  ssot_phase: 'GF-027'
});

const CategoryContract = Object.freeze({
  type: 'Category',
  version: CONTRACT_VERSION,
  fields: ['id', 'code', 'name', 'parent_id', 'company_id'],
  ssot_phase: 'GF-027'
});

const SpendCenterContract = Object.freeze({
  type: 'SpendCenter',
  version: CONTRACT_VERSION,
  fields: ['id', 'code', 'name', 'budget_limit', 'currency', 'company_id'],
  ssot_phase: 'GF-027'
});

const CANONICAL_CONTRACTS = Object.freeze({
  Supplier: SupplierContract,
  PurchaseRequest: PurchaseRequestContract,
  PurchaseOrder: PurchaseOrderContract,
  Contract: ContractContract,
  Quotation: QuotationContract,
  Approval: ApprovalContract,
  Category: CategoryContract,
  SpendCenter: SpendCenterContract
});

function getContract(type) {
  return CANONICAL_CONTRACTS[type] || null;
}

function listContractTypes() {
  return Object.keys(CANONICAL_CONTRACTS);
}

module.exports = {
  CONTRACT_VERSION,
  CANONICAL_CONTRACTS,
  SupplierContract,
  PurchaseRequestContract,
  PurchaseOrderContract,
  ContractContract,
  QuotationContract,
  ApprovalContract,
  CategoryContract,
  SpendCenterContract,
  getContract,
  listContractTypes
};
