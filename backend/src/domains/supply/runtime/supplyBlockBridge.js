'use strict';

/**
 * GF-024 — Block bridge: semântica → blocos cognitivos (Read-Only).
 */

const { SUPPLY_ENTITY_BLOCK_MAP } = require('../registry/supplySemanticBlockRegistry');
const { logSupplySignalLoaderEvent } = require('./supplySignalLoaderLogger');

function _result(blockId, { binding_ok, entity, signal_count, reason, metrics = {} }) {
  return Object.freeze({
    block_id: blockId,
    binding_ok: binding_ok === true,
    entity,
    signal_count: signal_count ?? 0,
    reason: reason || (binding_ok ? 'SEMANTIC_BOUND' : 'NO_SEMANTIC_SIGNAL'),
    bridge_status: binding_ok ? 'semantic_bound' : 'semantic_empty',
    read_only: true,
    render_active: false,
    metrics: Object.freeze(metrics)
  });
}

function _bindEntityBlock(entityType, bundle) {
  const blockId = SUPPLY_ENTITY_BLOCK_MAP[entityType];
  const obs = bundle?.semantic_bundle?.entities?.[entityType];
  if (!obs || obs.total === 0) {
    return _result(blockId, {
      binding_ok: false,
      entity: entityType,
      signal_count: 0,
      reason: 'NO_SEMANTIC_SIGNAL'
    });
  }
  return _result(blockId, {
    binding_ok: true,
    entity: entityType,
    signal_count: obs.total,
    reason: 'SEMANTIC_BOUND',
    metrics: Object.freeze({ status_counts: obs.counts })
  });
}

function invokeSupplyBlockBridge(blockId, signalBundle = {}, ctx = {}) {
  const t0 = Date.now();
  const entityEntry = Object.entries(SUPPLY_ENTITY_BLOCK_MAP).find(([, id]) => id === blockId);
  if (!entityEntry) {
    return _result(blockId, { binding_ok: false, entity: null, signal_count: 0, reason: 'UNKNOWN_BLOCK' });
  }
  const [entityType] = entityEntry;
  const binding = _bindEntityBlock(entityType, signalBundle);
  logSupplySignalLoaderEvent(binding.binding_ok ? 'BLOCK_BOUND' : 'BLOCK_EMPTY', {
    runtime: 'supply_native',
    entity: entityType,
    event: blockId,
    binding: binding.signal_count,
    duration_ms: Date.now() - t0,
    origin: ctx.origin || 'semantic_bridge'
  });
  return binding;
}

module.exports = { invokeSupplyBlockBridge, _bindEntityBlock };
