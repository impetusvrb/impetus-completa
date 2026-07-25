'use strict';

const { PPAP_PILOT_BLOCK_IDS } = require('../../../registry/ppapCognitiveBlockPack');
const { buildBindingValidationReport } = require('../../../observability/bindingValidationReport');
const { loadPpapTenantSignals } = require('./ppapTenantSignalLoader');
const { invokePpapBlockBridge } = require('./ppapBlockBridge');
const { logPpapSignal } = require('./ppapSignalLoaderLogger');

/**
 * GF-003 — Executa loader + binding Z.20 dos 12 blocos pilot PPAP.
 * binding_ratio via buildBindingValidationReport (paridade Quality/Logistics).
 */
async function runPpapSignalBinding(user = {}, ctx = {}) {
  const signalBundle = await loadPpapTenantSignals(user, ctx);
  const priorBindings = [];
  const enrichedBlocks = [];

  for (const blockId of PPAP_PILOT_BLOCK_IDS) {
    const binding = invokePpapBlockBridge(blockId, signalBundle, {
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
    logPpapSignal(binding.binding_ok ? 'BLOCK_BOUND' : 'BLOCK_NOT_BOUND', {
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

  logPpapSignal('BINDING_COMPLETE', {
    tenant_id: user?.company_id,
    binding_ratio: validation.binding_ratio,
    blocks_bound: validation.blocks_bound
  });

  return {
    ok: signalBundle.ok === true,
    inactive: true,
    signal_bundle: signalBundle,
    binding_validation: validation,
    binding_ratio: validation.binding_ratio,
    pilot_blocks: PPAP_PILOT_BLOCK_IDS.slice(),
    bound_blocks,
    missing_blocks,
    block_details,
    enriched_blocks: enrichedBlocks,
    signal_readiness: signalBundle.signal_readiness,
    data_sources: signalBundle.data_sources || []
  };
}

module.exports = { runPpapSignalBinding };
