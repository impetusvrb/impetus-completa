'use strict';

const flagsZ26 = require('../config/phaseZ26FeatureFlags');
const { composeRuntimeCockpit } = require('../composition/runtimeCockpitComposer');
const { HR_PILOT_BLOCK_IDS } = require('../registry/hrCognitiveBlockPack');

function isHrPilotActive(ctx = {}) {
  return (
    flagsZ26.isHrNativeCockpitPilot() ||
    flagsZ26.isHrCognitiveRuntimeActive() ||
    flagsZ26.isHrCognitiveRuntimeShadow() ||
    ctx.force_hr_pilot === true
  );
}

function isHrProfile(payload = {}, ctx = {}) {
  const pc = String(payload.profile_code || ctx.profile_code || '').toLowerCase();
  const axis = String(payload.functional_axis || payload.functional_area || ctx.domain_axis || '').toLowerCase();
  return flagsZ26.isPilotProfile(pc) || axis === 'hr' || axis === 'rh' || pc === 'hr_management';
}

async function runHrCockpitPilot(user = {}, payload = {}, ctx = {}) {
  if (!isHrPilotActive(ctx)) {
    return { pilot_skipped: true, reason: 'hr_cockpit_pilot_off', phase: 'Z.26' };
  }
  if (!isHrProfile(payload, ctx)) {
    return { pilot_skipped: true, reason: 'not_hr_profile', phase: 'Z.26', profile_code: payload.profile_code };
  }

  const composition = await composeRuntimeCockpit(user, payload, {
    ...ctx,
    domain_axis: 'hr',
    functional_area: 'hr',
    force_composition: ctx.force_composition === true
  });

  return {
    pilot_id: 'hr_cognitive_pilot_v1',
    pilot_active: true,
    official_block_ids: HR_PILOT_BLOCK_IDS,
    ...composition
  };
}

module.exports = { isHrPilotActive, isHrProfile, runHrCockpitPilot };
