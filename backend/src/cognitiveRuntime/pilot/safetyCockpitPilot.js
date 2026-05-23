'use strict';

const flagsZ25 = require('../config/phaseZ25FeatureFlags');
const { composeRuntimeCockpit } = require('../composition/runtimeCockpitComposer');
const { SST_PILOT_BLOCK_IDS } = require('../registry/sstCognitiveBlockPack');

function isSafetyPilotActive(ctx = {}) {
  return (
    flagsZ25.isSstNativeCockpitPilot() ||
    flagsZ25.isSafetyCognitiveRuntimeActive() ||
    flagsZ25.isSafetyCognitiveRuntimeShadow() ||
    ctx.force_safety_pilot === true
  );
}

function isSafetyProfile(payload = {}, ctx = {}) {
  const pc = String(payload.profile_code || ctx.profile_code || '').toLowerCase();
  const axis = String(payload.functional_axis || payload.functional_area || ctx.domain_axis || '').toLowerCase();
  return flagsZ25.isPilotProfile(pc) || axis === 'safety' || pc.includes('safety');
}

async function runSafetyCockpitPilot(user = {}, payload = {}, ctx = {}) {
  if (!isSafetyPilotActive(ctx)) {
    return { pilot_skipped: true, reason: 'safety_cockpit_pilot_off', phase: 'Z.25' };
  }
  if (!isSafetyProfile(payload, ctx)) {
    return {
      pilot_skipped: true,
      reason: 'not_safety_profile',
      phase: 'Z.25',
      profile_code: payload.profile_code
    };
  }

  const composition = await composeRuntimeCockpit(user, payload, {
    ...ctx,
    domain_axis: 'safety',
    functional_area: 'safety',
    force_composition: ctx.force_composition === true
  });

  return {
    pilot_id: 'safety_cognitive_pilot_v1',
    pilot_active: true,
    official_block_ids: SST_PILOT_BLOCK_IDS,
    ...composition
  };
}

module.exports = { isSafetyPilotActive, isSafetyProfile, runSafetyCockpitPilot };
