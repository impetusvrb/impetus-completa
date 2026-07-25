'use strict';

const flags = require('../config/phaseLogisticsNativeFeatureFlags');
const { LOGISTICS_PILOT_BLOCK_IDS } = require('../registry/logisticsCognitiveBlockPack');
const { runLogisticsSignalBinding } = require('../domains/logistics/bridge/logisticsSignalBindingRuntime');

async function runLogisticsCockpitPilot(user = {}, payload = {}, ctx = {}) {
  if (
    !flags.isLogisticsCognitiveRuntimeActive() &&
    !flags.isLogisticsCognitiveRuntimeShadow() &&
    !ctx.force_logistics_pilot
  ) {
    return { pilot_skipped: true, reason: 'logistics_cockpit_pilot_off', phase: 'Z.19' };
  }

  const pc = String(payload.profile_code || ctx.profile_code || '').toLowerCase();
  const axis = String(payload.functional_axis || payload.functional_area || ctx.domain_axis || '').toLowerCase();
  const logisticsAxis =
    axis === 'logistics' ||
    axis === 'logistica' ||
    axis === 'logística' ||
    axis === 'eixo_logistica' ||
    axis === 'eixo_estoque';

  if (!flags.isPilotProfile(pc) && !logisticsAxis && ctx.force_logistics_pilot !== true) {
    return { pilot_skipped: true, reason: 'not_logistics_profile', profile_code: payload.profile_code, phase: 'Z.19' };
  }

  const binding = await runLogisticsSignalBinding(user, ctx);

  return {
    pilot_id: 'logistics_cognitive_pilot_v1',
    pilot_active: true,
    foundation_only: true,
    official_block_ids: LOGISTICS_PILOT_BLOCK_IDS,
    phase: 'Z.19',
    engine_bridge: {
      binding_ratio: binding.binding_ratio,
      bound_blocks: binding.bound_blocks,
      missing_blocks: binding.missing_blocks,
      foundation_only: true
    },
    composition_score: binding.binding_ratio,
    shadow_cognitive_cockpit: {
      blocks: binding.enriched_blocks.map((b) => ({
        block_id: b.block_id,
        eligible: b.enriched,
        shadow_signals: b.shadow_signals
      }))
    },
    logistics_signal_loader: {
      binding_ratio: binding.binding_ratio,
      bound_blocks: binding.bound_blocks,
      missing_blocks: binding.missing_blocks
    }
  };
}

module.exports = { runLogisticsCockpitPilot };
