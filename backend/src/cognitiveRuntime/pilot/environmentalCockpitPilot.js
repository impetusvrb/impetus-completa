'use strict';

const flags = require('../config/phaseP1EnvironmentalFeatureFlags');
const { composeRuntimeCockpit } = require('../composition/runtimeCockpitComposer');
const { ENVIRONMENTAL_PILOT_BLOCK_IDS } = require('../registry/environmentalCognitiveBlockPack');

async function runEnvironmentalCockpitPilot(user = {}, payload = {}, ctx = {}) {
  if (!flags.isEnvironmentalCognitiveRuntimeActive() && !flags.isEnvironmentalCognitiveRuntimeShadow() && !ctx.force_environmental_pilot) {
    return { pilot_skipped: true, reason: 'environmental_cockpit_pilot_off', phase: 'P1-ENV' };
  }
  const pc = String(payload.profile_code || ctx.profile_code || '').toLowerCase();
  const axis = String(payload.functional_axis || payload.functional_area || ctx.domain_axis || '').toLowerCase();
  if (!flags.isPilotProfile(pc) && axis !== 'environmental' && axis !== 'ambiental' && ctx.force_environmental_pilot !== true) {
    return { pilot_skipped: true, reason: 'not_environmental_profile', profile_code: payload.profile_code };
  }

  const composition = await composeRuntimeCockpit(user, payload, {
    ...ctx,
    domain_axis: 'environmental',
    functional_area: 'environmental',
    force_composition: ctx.force_composition === true
  });

  return {
    pilot_id: 'environmental_cognitive_pilot_v1',
    pilot_active: true,
    official_block_ids: ENVIRONMENTAL_PILOT_BLOCK_IDS,
    ...composition
  };
}

module.exports = { runEnvironmentalCockpitPilot };
