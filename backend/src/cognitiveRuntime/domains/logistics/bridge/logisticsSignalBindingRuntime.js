'use strict';

const { LOGISTICS_PILOT_BLOCK_IDS } = require('../../../registry/logisticsCognitiveBlockPack');
const { buildBindingValidationReport } = require('../../../observability/bindingValidationReport');
const { loadLogisticsTenantSignals } = require('./logisticsTenantSignalLoader');
const { invokeLogisticsBlockBridge } = require('./logisticsBlockBridge');
const { logLogisticsSignal } = require('./logisticsSignalLoaderLogger');

/**
 * Executa loader + binding dos 13 blocos pilot.
 * binding_ratio via buildBindingValidationReport (paridade Quality Z.20).
 */
async function runLogisticsSignalBinding(user = {}, ctx = {}) {
  const signalBundle = await loadLogisticsTenantSignals(user, ctx);
  const priorBindings = [];
  const enrichedBlocks = [];

  for (const blockId of LOGISTICS_PILOT_BLOCK_IDS) {
    const binding = invokeLogisticsBlockBridge(blockId, signalBundle, {
      ...ctx,
      tenant_id: user?.company_id,
      _prior_bindings: priorBindings
    });
    priorBindings.push(binding);
    enrichedBlocks.push({
      block_id: blockId,
      enriched: binding.binding_ok === true,
      shadow_signals: {
        ...binding,
        phase: 'Z.20',
        enrichment_mode: 'signal_loader_only'
      }
    });
    logLogisticsSignal(binding.binding_ok ? 'BLOCK_BOUND' : 'BLOCK_NOT_BOUND', {
      tenant_id: user?.company_id,
      block_id: blockId,
      reason: binding.reason,
      signal_count: binding.signal_count,
      dataset_used: binding.dataset_used
    });
  }

  const validation = buildBindingValidationReport(enrichedBlocks, signalBundle);
  const bound_blocks = enrichedBlocks
    .filter((b) => b.shadow_signals?.binding_ok)
    .map((b) => b.block_id);
  const missing_blocks = enrichedBlocks
    .filter((b) => !b.shadow_signals?.binding_ok)
    .map((b) => ({
      block_id: b.block_id,
      reason: b.shadow_signals?.reason,
      dataset_used: b.shadow_signals?.dataset_used
    }));

  const block_details = enrichedBlocks.map((b) => ({
    block_id: b.block_id,
    engine_ok: b.shadow_signals?.engine_ok,
    binding_ok: b.shadow_signals?.binding_ok,
    dataset_used: b.shadow_signals?.dataset_used,
    signal_count: b.shadow_signals?.signal_count,
    reason: b.shadow_signals?.reason
  }));

  logLogisticsSignal('BINDING_COMPLETE', {
    tenant_id: user?.company_id,
    binding_ratio: validation.binding_ratio,
    blocks_bound: validation.blocks_bound
  });

  return {
    ok: signalBundle.ok === true,
    signal_bundle: signalBundle,
    binding_validation: validation,
    binding_ratio: validation.binding_ratio,
    pilot_blocks: LOGISTICS_PILOT_BLOCK_IDS.slice(),
    bound_blocks,
    missing_blocks,
    block_details,
    enriched_blocks: enrichedBlocks
  };
}

module.exports = { runLogisticsSignalBinding };
