'use strict';

/**
 * GF-025 — Registo dos 7 centros cognitivos Supply (GF-021 §6).
 * Apenas registo — sem comportamento avançado.
 */

const SUPPLY_COGNITIVE_CENTER_IDS = Object.freeze([
  'supply.center.overview',
  'supply.center.inbound_exceptions',
  'supply.center.commitments',
  'supply.center.supplier_performance',
  'supply.center.procurement_trends',
  'supply.center.procurement_actions',
  'supply.center.requisition_queue'
]);

const SUPPLY_COGNITIVE_CENTERS = Object.freeze([
  {
    center_id: 'supply.center.overview',
    title: 'Supply Overview',
    objective: 'Panorama spend/OTIF',
    registered_block_ids: Object.freeze(SUPPLY_COGNITIVE_CENTER_IDS.slice()),
    phase: 'GF-025',
    behavior: 'registry_only'
  },
  {
    center_id: 'supply.center.inbound_exceptions',
    title: 'Inbound Exceptions',
    objective: 'Fila excepções recebimento',
    registered_block_ids: Object.freeze([]),
    phase: 'GF-025',
    behavior: 'registry_only',
    future_integration: 'OCL read (declarative)'
  },
  {
    center_id: 'supply.center.commitments',
    title: 'Commitments',
    objective: 'POs e contratos',
    registered_block_ids: Object.freeze(['supply.purchase_order_tracker', 'supply.contract_lifecycle']),
    phase: 'GF-025',
    behavior: 'registry_only'
  },
  {
    center_id: 'supply.center.supplier_performance',
    title: 'Supplier Performance',
    objective: 'Score fornecedores',
    registered_block_ids: Object.freeze(['supply.supplier_registry']),
    phase: 'GF-025',
    behavior: 'registry_only'
  },
  {
    center_id: 'supply.center.procurement_trends',
    title: 'Procurement Trends',
    objective: 'Lead time · spend',
    registered_block_ids: Object.freeze(['supply.spend_center_budget']),
    phase: 'GF-025',
    behavior: 'registry_only'
  },
  {
    center_id: 'supply.center.procurement_actions',
    title: 'Procurement Actions',
    objective: 'Acções sugeridas',
    registered_block_ids: Object.freeze(['supply.approval_workflow']),
    phase: 'GF-025',
    behavior: 'registry_only'
  },
  {
    center_id: 'supply.center.requisition_queue',
    title: 'Requisition Queue',
    objective: 'Requisições pendentes',
    registered_block_ids: Object.freeze(['supply.purchase_request_queue', 'supply.quotation_evaluation']),
    phase: 'GF-025',
    behavior: 'registry_only'
  }
]);

function getSupplyCommandCenterRegistry() {
  return SUPPLY_COGNITIVE_CENTERS;
}

function getCenterById(centerId) {
  return SUPPLY_COGNITIVE_CENTERS.find((c) => c.center_id === centerId) || null;
}

module.exports = {
  SUPPLY_COGNITIVE_CENTER_IDS,
  SUPPLY_COGNITIVE_CENTERS,
  getSupplyCommandCenterRegistry,
  getCenterById
};
