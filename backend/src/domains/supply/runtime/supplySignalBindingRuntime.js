'use strict';

/**
 * GF-024 — Semantic binding runtime (Z.20 preparatory — Read-Only).
 */

const { SUPPLY_SEMANTIC_BLOCK_IDS } = require('../registry/supplySemanticBlockRegistry');
const { loadSupplyTenantSignals } = require('./supplyTenantSignalLoader');
const { invokeSupplyBlockBridge } = require('./supplyBlockBridge');
const { logSupplySignalLoaderEvent } = require('./supplySignalLoaderLogger');

function _buildBindingReport(enrichedBlocks) {
  const total = enrichedBlocks.length;
  const bound = enrichedBlocks.filter((b) => b.shadow_signals?.binding_ok).length;
  const binding_ratio = total === 0 ? 0 : Math.round((bound / total) * 1000) / 1000;
  return {
    blocks_total: total,
    blocks_bound: bound,
    binding_ratio
  };
}

async function runSupplySignalBinding(user = {}, ctx = {}) {
  const t0 = Date.now();
  const signalBundle = await loadSupplyTenantSignals(user, ctx);
  const enrichedBlocks = [];

  for (const blockId of SUPPLY_SEMANTIC_BLOCK_IDS) {
    const binding = invokeSupplyBlockBridge(blockId, signalBundle, {
      ...ctx,
      tenant_id: user?.company_id,
      origin: 'binding_runtime'
    });
    enrichedBlocks.push({
      block_id: blockId,
      enriched: binding.binding_ok === true,
      shadow_signals: Object.freeze({ ...binding, phase: 'Z.20', mode: 'semantic_read_only' })
    });
  }

  const validation = _buildBindingReport(enrichedBlocks);
  const bound_blocks = enrichedBlocks.filter((b) => b.shadow_signals?.binding_ok).map((b) => b.block_id);
  const missing_blocks = enrichedBlocks.filter((b) => !b.shadow_signals?.binding_ok).map((b) => ({
    block_id: b.block_id,
    reason: b.shadow_signals?.reason,
    entity: b.shadow_signals?.entity
  }));

  logSupplySignalLoaderEvent('BINDING_COMPLETE', {
    runtime: 'supply_native',
    binding: validation.binding_ratio,
    duration_ms: Date.now() - t0,
    origin: 'semantic_binding'
  });

  return Object.freeze({
    ok: signalBundle.ok === true,
    inactive: true,
    read_only: true,
    signal_bundle: signalBundle,
    binding_validation: Object.freeze(validation),
    binding_ratio: validation.binding_ratio,
    pilot_blocks: SUPPLY_SEMANTIC_BLOCK_IDS.slice(),
    bound_blocks,
    missing_blocks,
    enriched_blocks: Object.freeze(enrichedBlocks),
    signal_readiness: signalBundle.signal_readiness,
    ssot: signalBundle.ssot || 'supplyCoreSemantics.js',
    event_publication: false
  });
}

module.exports = { runSupplySignalBinding };
