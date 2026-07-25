'use strict';

const flags = require('../config/phaseMsaNativeFeatureFlags');
const { MSA_PILOT_BLOCK_IDS } = require('../registry/msaCognitiveBlockPack');
const { runMsaSignalBinding } = require('../domains/msa/bridge/msaSignalBindingRuntime');

/**
 * GF-010 — Z.19 msa_native pilot (consumidor passivo Z.20 quando flags activas).
 */
async function runMsaCockpitPilot(user = {}, payload = {}, ctx = {}) {
  if (
    !flags.isMsaCognitiveRuntimeActive() &&
    !flags.isMsaCognitiveRuntimeShadow() &&
    !ctx.force_msa_pilot
  ) {
    return { pilot_skipped: true, reason: 'msa_cockpit_pilot_off', phase: 'Z.19' };
  }

  const pc = String(payload.profile_code || ctx.profile_code || '').toLowerCase();
  const axis = String(payload.functional_axis || payload.functional_area || ctx.domain_axis || '').toLowerCase();
  const qualityAxis =
    axis === 'quality' ||
    axis === 'qualidade' ||
    axis === 'eixo_qualidade' ||
    axis === 'laboratory' ||
    axis === 'laboratorio';

  if (!flags.isPilotProfile(pc) && !qualityAxis && ctx.force_msa_pilot !== true) {
    return { pilot_skipped: true, reason: 'not_msa_profile', profile_code: payload.profile_code, phase: 'Z.19' };
  }

  const binding = await runMsaSignalBinding(user, ctx);

  return {
    pilot_id: 'msa_cognitive_pilot_v1',
    pilot_active: binding.binding_ratio > 0,
    foundation_only: false,
    inactive: binding.binding_ratio === 0,
    official_block_ids: MSA_PILOT_BLOCK_IDS,
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

module.exports = { runMsaCockpitPilot };
