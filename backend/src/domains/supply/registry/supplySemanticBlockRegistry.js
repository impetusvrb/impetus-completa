'use strict';

/**
 * GF-024 — Blocos cognitivos semânticos Supply (Semantic Signal Loader).
 */

const SUPPLY_ENTITY_BLOCK_MAP = Object.freeze({
  Supplier: 'supply.supplier_registry',
  PurchaseRequest: 'supply.purchase_request_queue',
  PurchaseOrder: 'supply.purchase_order_tracker',
  Quotation: 'supply.quotation_evaluation',
  Contract: 'supply.contract_lifecycle',
  Approval: 'supply.approval_workflow',
  SpendCenter: 'supply.spend_center_budget'
});

const SUPPLY_SEMANTIC_BLOCK_IDS = Object.freeze(Object.values(SUPPLY_ENTITY_BLOCK_MAP));

module.exports = {
  SUPPLY_ENTITY_BLOCK_MAP,
  SUPPLY_SEMANTIC_BLOCK_IDS
};
