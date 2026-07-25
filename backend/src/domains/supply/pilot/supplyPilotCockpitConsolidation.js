'use strict';

/**
 * GF-026 — Consolidação CC (Z.23 pilot) sobre foundation GF-025.
 */

const { getSupplyCommandCenterRegistry } = require('../cognitive/supplyCommandCenterRegistry');
const { logSupplyPilotEvent } = require('./supplyPilotObservability');

function consolidateSupplyPilotCockpit(promotionResult = {}, integrationResult = {}) {
  const t0 = Date.now();
  const foundation = promotionResult.supply_command_center_foundation;
  const promoted = promotionResult.promoted_blocks || [];
  const centers = getSupplyCommandCenterRegistry().map((center) => {
    const slots = center.registered_block_ids
      .map((bid) => promoted.find((p) => p.block_id === bid))
      .filter(Boolean)
      .map((p) =>
        Object.freeze({
          block_id: p.block_id,
          entity: p.entity,
          signal_count: p.signal_count,
          promotion_status: p.promotion_status,
          contract_resolved: true
        })
      );
    return Object.freeze({
      ...center,
      consolidated_blocks: Object.freeze(slots),
      consolidated_count: slots.length,
      inbound_logistics: integrationResult.logistics_bridge?.active === true ? 'bridge_attached' : 'semantic_only'
    });
  });

  logSupplyPilotEvent('CC_CONSOLIDATED', { duration_ms: Date.now() - t0, contract: 'SupplyCognitiveCenter' });

  return Object.freeze({
    runtime_id: 'supply_native',
    phase: 'Z.23',
    gf: 'GF-026',
    inactive: false,
    consolidation_applied: promoted.length > 0,
    promotion_applied: promotionResult.promotion_applied === true,
    cockpit_mode: 'supply_native',
    binding_ratio: promotionResult.binding_ratio ?? 0,
    promotion_ratio: promotionResult.promotion_ratio ?? 0,
    centers_count: centers.length,
    supply_cognitive_centers: Object.freeze(centers),
    command_center_foundation: foundation || null,
    pilot_integration_attached: integrationResult.ok === true,
    read_only: true,
    operational_logic: false,
    event_publication: false
  });
}

module.exports = { consolidateSupplyPilotCockpit };
