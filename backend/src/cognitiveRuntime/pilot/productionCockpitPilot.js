'use strict';

const flagsZP0 = require('../config/phaseZP0FeatureFlags');
const { composeRuntimeCockpit } = require('../composition/runtimeCockpitComposer');
const { PRODUCTION_PILOT_BLOCK_IDS } = require('../registry/productionCognitiveBlockPack');

function isProductionPilotActive(ctx = {}) {
  return (
    flagsZP0.isProductionNativeCockpitPilot() ||
    flagsZP0.isProductionCognitiveRuntimeActive() ||
    flagsZP0.isProductionCognitiveRuntimeShadow() ||
    ctx.force_production_pilot === true
  );
}

function isProductionProfile(payload = {}, ctx = {}) {
  const pc = String(payload.profile_code || ctx.profile_code || '').toLowerCase();
  const axis = String(payload.functional_axis || payload.functional_area || ctx.domain_axis || '').toLowerCase();
  return flagsZP0.isPilotProfile(pc) || axis === 'production' || axis === 'producao';
}

async function runProductionCockpitPilot(user = {}, payload = {}, ctx = {}) {
  if (!isProductionPilotActive(ctx)) {
    return { pilot_skipped: true, reason: 'production_cockpit_pilot_off', phase: 'Z.P0' };
  }
  if (!isProductionProfile(payload, ctx)) {
    return { pilot_skipped: true, reason: 'not_production_profile', phase: 'Z.P0', profile_code: payload.profile_code };
  }

  const composition = await composeRuntimeCockpit(user, payload, {
    ...ctx,
    domain_axis: 'production',
    functional_area: 'production',
    force_composition: ctx.force_composition === true
  });

  return {
    pilot_id: 'production_cognitive_pilot_v1',
    pilot_active: true,
    official_block_ids: PRODUCTION_PILOT_BLOCK_IDS,
    ...composition
  };
}

module.exports = { isProductionPilotActive, isProductionProfile, runProductionCockpitPilot };
