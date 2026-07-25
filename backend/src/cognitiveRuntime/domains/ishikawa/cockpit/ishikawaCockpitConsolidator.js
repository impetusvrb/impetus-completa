'use strict';

const { ISHIKAWA_PILOT_BLOCK_IDS } = require('../../../registry/ishikawaCognitiveBlockPack');
const { buildIshikawaCentersFromShadow } = require('./ishikawaCenters');

/**
 * GF-018 — Consolidator Z.23 ishikawa_native (monta centers; não recalcula binding).
 */
async function consolidateIshikawaCockpit(_user = {}, _payload = {}, _ctx = {}, ishikawaPilot = {}) {
  const shadow = ishikawaPilot.shadow_cognitive_cockpit || {};
  const centers = buildIshikawaCentersFromShadow(shadow, ishikawaPilot);
  const bindingRatio = ishikawaPilot?.engine_bridge?.binding_ratio ?? 0;
  const boundBlocks = ishikawaPilot?.engine_bridge?.bound_blocks || [];

  return {
    phase: 'Z.23',
    cockpit_mode: 'ishikawa_native',
    consolidation_applied: true,
    foundation_only: false,
    global_replace: false,
    auto_ishikawa: false,
    auto_action: false,
    centers,
    widgets: [],
    pilot_block_ids: ISHIKAWA_PILOT_BLOCK_IDS,
    ishikawa_cognitive_health: {
      specialized_ratio: bindingRatio,
      signal_ready: bindingRatio >= 0.35,
      semantic_ok: true,
      binding_ratio: bindingRatio,
      bound_blocks: boundBlocks.length,
      gf: 'GF-018'
    }
  };
}

module.exports = { consolidateIshikawaCockpit };
