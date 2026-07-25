'use strict';

/**
 * GF-022 — Registo conceptual de entidades (sem modelagem física).
 */

const SUPPLY_CONCEPTUAL_ENTITIES = Object.freeze([
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

module.exports = {
  SUPPLY_CONCEPTUAL_ENTITIES,
  DOMAIN_ID: 'supply',
  PROGRAM: 'GF-023',
  PHASE: 'CORE_DOMAIN'
};
