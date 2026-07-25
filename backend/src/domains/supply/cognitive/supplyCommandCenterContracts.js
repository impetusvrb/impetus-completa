'use strict';

/**
 * GF-025 — Contratos CC Supply (shapes only — sem lógica operacional).
 */

const CC_CONTRACT_VERSION = '0.1.0';

const SupplyCommandCenterFoundationContract = Object.freeze({
  type: 'SupplyCommandCenterFoundation',
  version: CC_CONTRACT_VERSION,
  payload_keys: ['supply_cognitive_runtime', 'supply_cognitive_centers', 'supply_promotion_runtime'],
  phase: 'GF-025',
  operational_logic: false,
  ui_business: false
});

const SupplyCognitiveCenterContract = Object.freeze({
  type: 'SupplyCognitiveCenter',
  version: CC_CONTRACT_VERSION,
  required_fields: ['center_id', 'title', 'objective', 'registered_block_ids'],
  ssot_phase: 'GF-025'
});

const SupplyPromotedBlockContract = Object.freeze({
  type: 'SupplyPromotedBlock',
  version: CC_CONTRACT_VERSION,
  required_fields: ['block_id', 'promotion_status', 'signal_count', 'entity'],
  source: 'cognitive_block_only'
});

module.exports = {
  CC_CONTRACT_VERSION,
  SupplyCommandCenterFoundationContract,
  SupplyCognitiveCenterContract,
  SupplyPromotedBlockContract
};
