'use strict';

const { MSA_PILOT_BLOCK_IDS } = require('../../../registry/msaCognitiveBlockPack');
const { buildMsaCentersFromShadow } = require('./msaCenters');

/**
 * GF-011 — Consolidator Z.23 msa_native (monta centers; não recalcula binding).
 */
async function consolidateMsaCockpit(_user = {}, _payload = {}, _ctx = {}, msaPilot = {}) {
  const shadow = msaPilot.shadow_cognitive_cockpit || {};
  const centers = buildMsaCentersFromShadow(shadow, msaPilot);
  const bindingRatio = msaPilot?.engine_bridge?.binding_ratio ?? 0;
  const boundBlocks = msaPilot?.engine_bridge?.bound_blocks || [];

  return {
    phase: 'Z.23',
    cockpit_mode: 'msa_native',
    consolidation_applied: true,
    foundation_only: false,
    global_replace: false,
    auto_msa: false,
    auto_action: false,
    centers,
    widgets: [],
    pilot_block_ids: MSA_PILOT_BLOCK_IDS,
    msa_cognitive_health: {
      specialized_ratio: bindingRatio,
      signal_ready: bindingRatio >= 0.35,
      semantic_ok: true,
      binding_ratio: bindingRatio,
      bound_blocks: boundBlocks.length,
      gf: 'GF-011'
    }
  };
}

module.exports = { consolidateMsaCockpit };
