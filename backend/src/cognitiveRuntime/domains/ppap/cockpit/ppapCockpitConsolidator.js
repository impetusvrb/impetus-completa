'use strict';

const { PPAP_PILOT_BLOCK_IDS } = require('../../../registry/ppapCognitiveBlockPack');
const { buildPpapCentersFromShadow } = require('./ppapCenters');

/**
 * GF-004 — Consolidator Z.23 ppap_native (monta centers; não recalcula binding).
 */
async function consolidatePpapCockpit(_user = {}, _payload = {}, _ctx = {}, ppapPilot = {}) {
  const shadow = ppapPilot.shadow_cognitive_cockpit || {};
  const centers = buildPpapCentersFromShadow(shadow, ppapPilot);
  const bindingRatio = ppapPilot?.engine_bridge?.binding_ratio ?? 0;
  const boundBlocks = ppapPilot?.engine_bridge?.bound_blocks || [];

  return {
    phase: 'Z.23',
    cockpit_mode: 'ppap_native',
    consolidation_applied: true,
    foundation_only: false,
    global_replace: false,
    auto_ppap: false,
    auto_action: false,
    centers,
    widgets: [],
    pilot_block_ids: PPAP_PILOT_BLOCK_IDS,
    ppap_cognitive_health: {
      specialized_ratio: bindingRatio,
      signal_ready: bindingRatio >= 0.35,
      semantic_ok: true,
      binding_ratio: bindingRatio,
      bound_blocks: boundBlocks.length,
      gf: 'GF-004'
    }
  };
}

module.exports = { consolidatePpapCockpit };
