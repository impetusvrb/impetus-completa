'use strict';

const flags = require('../config/phaseZM1FeatureFlags');
const { composeRuntimeCockpit } = require('../composition/runtimeCockpitComposer');
const { MAINTENANCE_PILOT_BLOCK_IDS } = require('../registry/maintenanceCognitiveBlockPack');

async function runMaintenanceCockpitPilot(user = {}, payload = {}, ctx = {}) {
  if (!flags.isMaintenanceCognitiveRuntimeActive() && !flags.isMaintenanceCognitiveRuntimeShadow() && !ctx.force_maintenance_pilot) {
    return { pilot_skipped: true, reason: 'maintenance_cockpit_pilot_off', phase: 'Z.M1' };
  }
  const pc = String(payload.profile_code || ctx.profile_code || '').toLowerCase();
  const axis = String(payload.functional_axis || payload.functional_area || ctx.domain_axis || '').toLowerCase();
  if (!flags.isPilotProfile(pc) && axis !== 'maintenance' && axis !== 'manutencao' && ctx.force_maintenance_pilot !== true) {
    return { pilot_skipped: true, reason: 'not_maintenance_profile', profile_code: payload.profile_code };
  }

  const composition = await composeRuntimeCockpit(user, payload, {
    ...ctx,
    domain_axis: 'maintenance',
    functional_area: 'maintenance',
    force_composition: ctx.force_composition === true
  });

  return {
    pilot_id: 'maintenance_cognitive_pilot_v1',
    pilot_active: true,
    official_block_ids: MAINTENANCE_PILOT_BLOCK_IDS,
    ...composition
  };
}

module.exports = { runMaintenanceCockpitPilot };
