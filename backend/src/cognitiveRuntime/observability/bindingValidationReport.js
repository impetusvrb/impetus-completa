'use strict';

function buildBindingValidationReport(enrichedBlocks = [], signalBundle = {}) {
  const total = enrichedBlocks.length;
  const bound = enrichedBlocks.filter(
    (b) => b.shadow_signals?.bridge_status === 'bound_z20' || b.enriched === true
  );
  const empty = enrichedBlocks.filter((b) => b.shadow_signals?.bridge_status === 'bound_empty');
  const errors = enrichedBlocks.filter((b) => b.shadow_signals?.bridge_status === 'bridge_error');
  const notInvoked = enrichedBlocks.filter(
    (b) =>
      b.shadow_signals?.bridge_status === 'not_invoked_z19' ||
      b.shadow_signals?.bridge_status === 'bridge_off'
  );

  const specialized_metrics = bound.map((b) => ({
    block_id: b.block_id,
    summary: b.shadow_signals?.summary,
    metrics: b.shadow_signals?.metrics
  }));

  return {
    phase: 'Z.20',
    total_blocks: total,
    blocks_bound: bound.length,
    blocks_empty: empty.length,
    blocks_error: errors.length,
    blocks_not_invoked: notInvoked.length,
    binding_ratio: total > 0 ? Math.round((bound.length / total) * 1000) / 1000 : 0,
    signal_load_ok: signalBundle.ok === true,
    specialized_delivery_ready: bound.length >= Math.min(6, total),
    specialized_metrics,
    validation_passed: errors.length === 0 && notInvoked.length === 0,
    delivery_mutation: false
  };
}

module.exports = {
  buildBindingValidationReport
};
