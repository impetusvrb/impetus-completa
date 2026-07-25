'use strict';

/**
 * GF-025 — Command Center Foundation (infra only · no ops · no UI).
 */

const { SUPPLY_RUNTIME_IDENTITY } = require('../core/supplyRuntimeIdentity');
const { getSupplyCommandCenterRegistry } = require('./supplyCommandCenterRegistry');
const { SupplyCommandCenterFoundationContract } = require('./supplyCommandCenterContracts');
const { logSupplyPromotionEvent } = require('../runtime/supplyPromotionLogger');

function _assignPromotedBlocksToCenters(promotedBlocks = []) {
  const promotedById = new Map(promotedBlocks.map((b) => [b.block_id, b]));
  const centers = getSupplyCommandCenterRegistry();

  return Object.freeze(
    centers.map((center) => {
      const slots = center.registered_block_ids
        .map((id) => promotedById.get(id))
        .filter(Boolean)
        .map((b) =>
          Object.freeze({
            block_id: b.block_id,
            promotion_status: b.promotion_status,
            signal_count: b.signal_count,
            entity: b.entity
          })
        );
      return Object.freeze({
        ...center,
        promoted_blocks: Object.freeze(slots),
        promoted_count: slots.length
      });
    })
  );
}

function buildSupplyCommandCenterFoundation(promotionResult = {}) {
  const t0 = Date.now();
  const promoted = promotionResult.promoted_blocks || [];
  const centers = _assignPromotedBlocksToCenters(promoted);

  logSupplyPromotionEvent('command_center', 'FOUNDATION_BUILT', {
    binding: centers.length,
    duration_ms: Date.now() - t0
  });

  return Object.freeze({
    runtime_id: SUPPLY_RUNTIME_IDENTITY.runtime_id,
    phase: 'GF-025',
    status: 'FOUNDATION',
    contract: SupplyCommandCenterFoundationContract.type,
    contract_version: SupplyCommandCenterFoundationContract.version,
    centers_count: centers.length,
    supply_cognitive_centers: centers,
    promotion_applied: promotionResult.promotion_applied === true,
    promotion_ratio: promotionResult.promotion_ratio ?? 0,
    inactive: true,
    read_only: true,
    operational_logic: false,
    ui_business: false,
    event_publication: false
  });
}

module.exports = {
  buildSupplyCommandCenterFoundation,
  _assignPromotedBlocksToCenters
};
