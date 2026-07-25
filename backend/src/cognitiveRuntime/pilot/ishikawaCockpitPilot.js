'use strict';

const flags = require('../config/phaseIshikawaNativeFeatureFlags');
const { ISHIKAWA_PILOT_BLOCK_IDS } = require('../registry/ishikawaCognitiveBlockPack');
const { runIshikawaSignalBinding } = require('../domains/ishikawa/bridge/ishikawaSignalBindingRuntime');

/**
 * GF-017/018 — Z.19 ishikawa_native pilot (consumidor passivo Z.20 via runIshikawaSignalBinding).
 */
async function runIshikawaCockpitPilot(user = {}, payload = {}, ctx = {}) {
  if (
    !flags.isIshikawaCognitiveRuntimeActive() &&
    !flags.isIshikawaCognitiveRuntimeShadow() &&
    !ctx.force_ishikawa_pilot
  ) {
    return { pilot_skipped: true, reason: 'ishikawa_cockpit_pilot_off', phase: 'Z.19' };
  }

  const pc = String(payload.profile_code || ctx.profile_code || '').toLowerCase();
  const axis = String(payload.functional_axis || payload.functional_area || ctx.domain_axis || '').toLowerCase();
  const qualityAxis = axis === 'quality' || axis === 'qualidade' || axis === 'eixo_qualidade';

  if (!flags.isPilotProfile(pc) && !qualityAxis && ctx.force_ishikawa_pilot !== true) {
    return { pilot_skipped: true, reason: 'not_ishikawa_profile', profile_code: payload.profile_code, phase: 'Z.19' };
  }

  const binding = await runIshikawaSignalBinding(user, ctx);

  return {
    pilot_id: 'ishikawa_cognitive_pilot_v1',
    pilot_active: binding.binding_ratio > 0,
    foundation_only: false,
    inactive: binding.binding_ratio === 0,
    official_block_ids: ISHIKAWA_PILOT_BLOCK_IDS,
    phase: 'Z.19',
    engine_bridge: {
      binding_ratio: binding.binding_ratio,
      bound_blocks: binding.bound_blocks,
      missing_blocks: binding.missing_blocks,
      signal_readiness: binding.signal_readiness,
      foundation_only: false
    },
    composition_score: binding.binding_ratio,
    shadow_cognitive_cockpit: {
      blocks: binding.enriched_blocks.map((b) => ({
        block_id: b.block_id,
        eligible: b.enriched,
        shadow_signals: b.shadow_signals
      }))
    }
  };
}

module.exports = { runIshikawaCockpitPilot };
