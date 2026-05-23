'use strict';

const flags = require('../config/phaseZ27FeatureFlags');
const { composeRuntimeCockpit } = require('../composition/runtimeCockpitComposer');
const { EXECUTIVE_PILOT_BLOCK_IDS } = require('../registry/executiveCognitiveBlockPack');
const { resolveExecutiveContext } = require('../domains/executive/aggregation/executiveContextResolver');

async function runExecutiveCockpitPilot(user = {}, payload = {}, ctx = {}) {
  if (!flags.isExecutiveCognitiveRuntimeActive() && !flags.isExecutiveCognitiveRuntimeShadow() && !ctx.force_executive_pilot) {
    return { pilot_skipped: true, reason: 'executive_cockpit_pilot_off', phase: 'Z.27' };
  }
  const execCtx = resolveExecutiveContext(user, payload, ctx);
  if (!execCtx.boardroom_eligible && ctx.force_executive_pilot !== true) {
    return { pilot_skipped: true, reason: 'not_executive_profile', profile_code: payload.profile_code };
  }

  const composition = await composeRuntimeCockpit(user, payload, {
    ...ctx,
    domain_axis: 'executive',
    functional_area: 'executive',
    force_composition: ctx.force_composition === true
  });

  return {
    pilot_id: 'executive_boardroom_pilot_v1',
    pilot_active: true,
    official_block_ids: EXECUTIVE_PILOT_BLOCK_IDS,
    ...composition
  };
}

module.exports = { runExecutiveCockpitPilot };
